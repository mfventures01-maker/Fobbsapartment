import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { callRPC } from '../lib/rpcClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/database';
import { getActiveShift } from '../services/staffService';
import { requestShift, endShift as apiEndShift, submitDeclaration as apiSubmitDeclaration } from '../services/staffService';
import { approveShift as apiApproveShift } from '../services/managerService';
import { subscribeToOperationalTelemetry } from '../lib/realtimeTelemetry';
import { SHIFT_STATUS } from '../constants/shiftStatus';

export type ShiftState =
    | { status: 'loading' }
    | { status: 'no_shift'; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.REQUESTED; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.OPEN; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.DECLARATION_SUBMITTED; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.AWAITING_CLOSE_APPROVAL; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: 'error'; error: string };

interface ShiftContextType {
    shiftState: ShiftState;
    refreshShift: () => Promise<void>;
    startShift: () => Promise<{ error: any }>;
    endShift: () => Promise<{ error: any }>;
    submitDeclaration: (declaration: { cash: number; pos: number; transfer: number }) => Promise<{ error: any; data?: any }>;
    approveShift: (shiftId: string) => Promise<{ error: any }>;
    rejectShift: (shiftId: string, reason: string) => Promise<{ error: any }>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user, staffId } = useAuth();
    const [shiftState, setShiftState] = useState<ShiftState>({ status: 'loading' });
    const isMounted = useRef(true);

    const resolveShift = useCallback(async () => {
        if (authority.status !== 'authorized' || !user || !staffId) {
            if (isMounted.current) setShiftState({ status: 'loading' });
            return;
        }

        try {
            console.log('[SHIFT STATE] Resolving deterministic state...');

            let businessShifts: Shift[] = [];
            // STEP 1 — Managers/CEOs resolve open shifts (Zero Drift Protocol)
            // Phase 3: Now handled via useSystemState heartbeat to ensure SSOT.
            businessShifts = [];

            // STEP 2 — Resolve personal shift for terminal control
            const shift = await getActiveShift(staffId);

            // STEP 3 — UI State orbit around DB state
            if (isMounted.current) {
                if (!shift) {
                    setShiftState({ status: 'no_shift', activeBusinessShifts: businessShifts });
                    return;
                }

                switch (shift.status) {
                    case SHIFT_STATUS.REQUESTED:
                        setShiftState({ status: SHIFT_STATUS.REQUESTED, shift, activeBusinessShifts: businessShifts });
                        break;
                    case SHIFT_STATUS.OPEN:
                        setShiftState({ status: SHIFT_STATUS.OPEN, shift, activeBusinessShifts: businessShifts });
                        break;
                    case SHIFT_STATUS.DECLARATION_SUBMITTED:
                        setShiftState({ status: SHIFT_STATUS.DECLARATION_SUBMITTED, shift, activeBusinessShifts: businessShifts });
                        break;
                    case SHIFT_STATUS.AWAITING_CLOSE_APPROVAL:
                        setShiftState({ status: SHIFT_STATUS.AWAITING_CLOSE_APPROVAL, shift, activeBusinessShifts: businessShifts });
                        break;
                    case SHIFT_STATUS.CLOSED:
                        setShiftState({ status: 'no_shift', activeBusinessShifts: businessShifts });
                        break;
                    default:
                        setShiftState({ status: 'no_shift', activeBusinessShifts: businessShifts });
                }
            }
        } catch (err: any) {
            console.error('[SHIFT] Resolve error:', err);
            if (isMounted.current) setShiftState({ status: 'error', error: err.message });
        }
    }, [authority, user]);

    useEffect(() => {
        isMounted.current = true;
        resolveShift();

        if (authority.branchId) {
            const unsubscribeTelemetry = subscribeToOperationalTelemetry(authority.branchId, {
                onShiftUpdate: () => {
                    console.log('[SHIFT STATE] Realtime shift update received, resolving...');
                    resolveShift();
                }
            });

            return () => {
                isMounted.current = false;
                unsubscribeTelemetry();
            };
        }
    }, [resolveShift, user, authority.branchId]);

    const startShift = async () => {
        if (authority.status !== 'authorized' || !staffId) {
            return { error: { message: 'Not authorized or staff identity unresolved' } };
        }

        if (!authority.businessId || !authority.branchId) {
            return { error: { message: 'Business context missing (Org/Branch ID unresolved)' } };
        }

        console.log('[SHIFT] Initiating startShift via deterministic service...');
        try {
            const result = await requestShift(authority.businessId, authority.branchId, staffId);
            if (!result?.success) {
                return { error: { message: 'Failed to request shift' } };
            }
            await resolveShift();
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const endShift = async () => {
        if (!user || shiftState.status !== SHIFT_STATUS.OPEN) return { error: { message: 'No active shift to end' } };

        console.log('[SHIFT] Initiating end_shift RPC via service...');
        try {
            const data = await apiEndShift();
            if (!data || !data.success) {
                return { error: { message: 'Failed to end shift' } };
            }
            await resolveShift();
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const submitDeclaration = async ({ cash, pos, transfer }: { cash: number; pos: number; transfer: number }) => {
        // DECLARATION GUARD
        if (!staffId) return { error: { message: 'Staff identity unresolved' }, data: undefined };

        const activeShift = await getActiveShift(staffId);
        if (!activeShift || activeShift.status !== SHIFT_STATUS.DECLARATION_SUBMITTED) {
            return { error: { message: 'No shift pending declaration or session desync' }, data: undefined };
        }

        // DECLARATION SUBMISSION LOCK
        if (activeShift.staff_id !== staffId) {
            console.error('[SHIFT] Ownership mismatch detected!', {
                activeStaff: activeShift.staff_id,
                resolvedStaff: staffId
            });
            throw new Error('Shift ownership mismatch');
        }

        try {
            const data = await apiSubmitDeclaration(cash, pos, transfer, activeShift.id);
            if (data?.success) {
                await resolveShift();
                return { error: null, data };
            }
            if (!data || !data.success) {
                return { error: { message: 'Submission failed' }, data: undefined };
            }
            return { error: { message: 'Unknown state' }, data: undefined };
        } catch (error: any) {
            return { error, data: undefined };
        }
    };

    const approveShift = async (shiftId: string) => {
        try {
            const data = await apiApproveShift(shiftId);
            if (data?.success) {
                await resolveShift();
                return { error: null };
            }
            return { error: { message: 'Approval failed' } };
        } catch (error: any) {
            return { error };
        }
    };

    const rejectShift = async (shiftId: string, reason: string) => {
        try {
            // ✅ Step 1: Transition to callRPC (Purification Protocol)
            const result = await callRPC<any>('manager', 'reject_shift', {
                p_shift_id: shiftId,
                p_reason: reason,
                _idempotency_key: crypto.randomUUID()
            });

            if (result?.success) {
                await resolveShift();
                return { error: null };
            }
            return { error: { message: 'Rejection failed' } };
        } catch (err: any) {
            return { error: err };
        }
    };

    return (
        <ShiftContext.Provider value={{
            shiftState,
            refreshShift: resolveShift,
            startShift,
            endShift,
            submitDeclaration,
            approveShift,
            rejectShift
        }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShiftState = () => {
    const context = useContext(ShiftContext);
    if (context === undefined) throw new Error('useShiftState must be used within a ShiftProvider');
    return context;
};
