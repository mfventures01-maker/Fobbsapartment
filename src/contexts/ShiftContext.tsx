import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { callRPC } from '../lib/rpcClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/database';
import { getActiveShift } from '../services/staffService';
import { requestShift, endShift as apiEndShift, submitDeclaration as apiSubmitDeclaration } from '../services/staffService';
import { approveShift as apiApproveShift } from '../services/managerService';
import { subscribeToOperationalTelemetry } from '../lib/realtimeTelemetry';
import { SHIFT_STATUS } from '../constants/shiftStatus';

// 🛸 ANTI-GRAVITY: Shift mutation guard — prevents concurrent shift operations
const useMutationMutex = () => {
    const isMutating = useRef(false);
    const acquire = () => {
        if (isMutating.current) return false;
        isMutating.current = true;
        return true;
    };
    const release = () => { isMutating.current = false; };
    return { acquire, release };
};

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
    const { acquire: acquireMutex, release: releaseMutex } = useMutationMutex();

    const resolveShift = useCallback(async () => {
        // ⛔ ANTI-GRAVITY HYDRATION GATE: block until RPC identity is confirmed
        if (!authority.hydrated || !user || !staffId) {
            console.log('[SHIFT STATE] ⛔ Hydration gate closed — shift resolution blocked (hydrated=%s)', authority.hydrated);
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
            const shift = await getActiveShift(
                authority.businessId || '',
                authority.branchId || '',
                staffId,
                authority.role || 'staff'
            );

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
    }, [authority, user, staffId]);

    useEffect(() => {
        isMounted.current = true;
        // Only attempt shift resolution once the hydration gate is open
        if (authority.hydrated) {
            resolveShift();
        }

        if (authority.hydrated && authority.branchId) {
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

        return () => {
            isMounted.current = false;
        };
    }, [resolveShift, user, authority.hydrated, authority.branchId]);

    const startShift = async () => {
        // ⛔ ANTI-GRAVITY HYDRATION GATE
        if (!authority.hydrated || !staffId) {
            return { error: { message: 'Identity not hydrated. Cannot start shift until backend confirms role.' } };
        }
        if (!authority.businessId || !authority.branchId) {
            return { error: { message: 'Business context missing (Org/Branch ID unresolved)' } };
        }

        // 🔒 MUTEX: Prevent concurrent shift opens
        if (!acquireMutex()) {
            return { error: { message: 'Shift operation already in progress. Please wait.' } };
        }

        // 🔑 KEY: Generated once here, passed to service
        const idempotencyKey = crypto.randomUUID();
        console.log(`[SHIFT] Initiating startShift (key: ${idempotencyKey.slice(0, 8)})`);
        try {
            const result = await requestShift(authority.businessId, authority.branchId, staffId, idempotencyKey);
            if (!result?.success) {
                return { error: { message: 'Failed to request shift' } };
            }
            await resolveShift();
            return { error: null };
        } catch (error: any) {
            return { error };
        } finally {
            releaseMutex();
        }
    };

    const endShift = async () => {
        if (!user || shiftState.status !== SHIFT_STATUS.OPEN) return { error: { message: 'No active shift to end' } };

        if (!acquireMutex()) {
            return { error: { message: 'Shift operation already in progress. Please wait.' } };
        }

        const idempotencyKey = crypto.randomUUID();
        console.log(`[SHIFT] Initiating end_shift (key: ${idempotencyKey.slice(0, 8)})`);
        try {
            const data = await apiEndShift(idempotencyKey);
            if (!data || !data.success) {
                return { error: { message: 'Failed to end shift' } };
            }
            await resolveShift();
            return { error: null };
        } catch (error: any) {
            return { error };
        } finally {
            releaseMutex();
        }
    };

    const submitDeclaration = async ({ cash, pos, transfer }: { cash: number; pos: number; transfer: number }) => {
        if (!staffId || !authority?.businessId || !authority?.branchId) return { error: { message: 'Incomplete identity context' }, data: undefined };

        if (!acquireMutex()) {
            return { error: { message: 'Shift operation already in progress.' }, data: undefined };
        }

        try {
            const activeShift = await getActiveShift(
                authority.businessId,
                authority.branchId,
                staffId,
                authority.role || 'staff'
            );
            if (!activeShift || activeShift.status !== SHIFT_STATUS.DECLARATION_SUBMITTED) {
                return { error: { message: 'No shift pending declaration or session desync' }, data: undefined };
            }

            if (activeShift.staff_id !== staffId) {
                console.error('[SHIFT] Ownership mismatch detected!', { activeStaff: activeShift.staff_id, resolvedStaff: staffId });
                throw new Error('Shift ownership mismatch');
            }

            // 🔑 KEY: Generated once, passed to service
            const idempotencyKey = crypto.randomUUID();
            console.log(`[SHIFT] Submitting declaration (key: ${idempotencyKey.slice(0, 8)})`);

            const data = await apiSubmitDeclaration(cash, pos, transfer, activeShift.id, idempotencyKey);
            if (data?.success) {
                await resolveShift();
                return { error: null, data };
            }
            return { error: { message: 'Submission failed' }, data: undefined };
        } catch (error: any) {
            return { error, data: undefined };
        } finally {
            releaseMutex();
        }
    };

    const approveShift = async (shiftId: string) => {
        if (!acquireMutex()) return { error: { message: 'Shift operation already in progress.' } };
        const idempotencyKey = crypto.randomUUID();
        try {
            const data = await apiApproveShift(shiftId, idempotencyKey);
            if (data?.success) {
                await resolveShift();
                return { error: null };
            }
            return { error: { message: 'Approval failed' } };
        } catch (error: any) {
            return { error };
        } finally {
            releaseMutex();
        }
    };

    const rejectShift = async (shiftId: string, reason: string) => {
        if (!acquireMutex()) return { error: { message: 'Shift operation already in progress.' } };
        const idempotencyKey = crypto.randomUUID();
        try {
            const result = await callRPC<any>('manager', 'reject_shift', {
                p_shift_id: shiftId,
                p_reason: reason,
                _idempotency_key: idempotencyKey
            });

            if (result?.success) {
                await resolveShift();
                return { error: null };
            }
            return { error: { message: 'Rejection failed' } };
        } catch (err: any) {
            return { error: err };
        } finally {
            releaseMutex();
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
