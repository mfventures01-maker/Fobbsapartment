import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/database';
import { getActiveShift } from '../lib/shiftService'; // Note: if getActiveShift isn't moved yet we can leave it
import { requestShift, endShift as apiEndShift, submitDeclaration as apiSubmitDeclaration, approveShift as apiApproveShift } from '../services/shiftService';
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
    const { authority, user } = useAuth();
    const [shiftState, setShiftState] = useState<ShiftState>({ status: 'loading' });
    const isMounted = useRef(true);

    const resolveShift = useCallback(async () => {
        if (authority.status !== 'authorized' || !user) {
            if (isMounted.current) setShiftState({ status: 'loading' });
            return;
        }

        try {
            console.log('[SHIFT CONTEXT] Resolving via ANTI-GRAVITY engine...');

            const { role } = authority;
            const isManagement = role === 'super_admin' || role === 'ceo' || role === 'owner' || role === 'manager';
            let businessShifts: Shift[] = [];

            // STEP 1 — Managers/CEOs resolve open shifts. 
            // Phase 3: Scoped to Branch for non-CEOs.
            if (isManagement && authority.businessId && authority.branchId) {
                let query = supabase
                    .from('shifts')
                    .select('*')
                    .eq('business_id', authority.businessId)
                    .neq('status', SHIFT_STATUS.CLOSED);

                // If not high-authority (super_admin/ceo), lock to branch.
                if (role !== 'super_admin' && role !== 'ceo' && role !== 'owner') {
                    query = query.eq('branch_id', authority.branchId);
                }

                const { data: allShifts } = await query;
                businessShifts = allShifts || [];
            }

            // STEP 2 — Resolve personal shift for terminal control
            const shift = await getActiveShift(user.id);

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
                    console.log('[SHIFT CONTEXT] Realtime shift update received, resolving state');
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
        if (authority.status !== 'authorized' || !user) return { error: { message: 'Not authorized' } };

        console.log('[SHIFT] Initiating request_shift RPC via service...');
        try {
            const data = await requestShift();
            if (!data?.success) {
                return { error: (data?.error ? { message: data.error } : { message: 'Failed to request shift' }) };
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
            if (!data?.success) {
                return { error: (data?.error ? { message: data.error } : { message: 'Failed to end shift' }) };
            }
            await resolveShift();
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const submitDeclaration = async ({ cash, pos, transfer }: { cash: number; pos: number; transfer: number }) => {
        // STEP 5 — DECLARATION GUARD
        const activeShift = await getActiveShift(user!.id);
        if (!activeShift || activeShift.status !== SHIFT_STATUS.DECLARATION_SUBMITTED) {
            return { error: { message: 'No shift pending declaration or session desync' } };
        }

        // PHASE 3 — DECLARATION SUBMISSION LOCK
        if (activeShift.staff_id !== user!.id) {
            console.error('[SHIFT] Ownership mismatch detected!', {
                activeStaff: activeShift.staff_id,
                authUser: user!.id
            });
            throw new Error('Shift ownership mismatch');
        }

        try {
            const data = await apiSubmitDeclaration(cash, pos, transfer, activeShift.id);
            if (data?.success) {
                await resolveShift();
                return { error: null, data };
            }
            return { error: (data?.error ? { message: data.error } : { message: 'Submission failed' }) };
        } catch (error: any) {
            return { error };
        }
    };

    const approveShift = async (shiftId: string) => {
        try {
            const data = await apiApproveShift(shiftId);
            if (data?.success) {
                await resolveShift();
                return { error: null };
            }
            return { error: (data?.error ? { message: data.error } : null) };
        } catch (error: any) {
            return { error };
        }
    };

    const rejectShift = async (shiftId: string, reason: string) => {
        const { data, error } = await (supabase as any).rpc('reject_shift', {
            p_shift_id: shiftId,
            p_reason: reason
        });

        if (!error && data?.success) {
            await resolveShift();
            return { error: null };
        }
        return { error: error || (data?.error ? { message: data.error } : null) };
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
