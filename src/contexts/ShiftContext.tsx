import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/db';
import { getActiveShift, submitShiftDeclaration as apiSubmitDeclaration } from '../lib/shiftService';
import { SHIFT_STATUS } from '../constants/shiftStatus';

export type ShiftState =
    | { status: 'loading' }
    | { status: 'no_shift'; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.REQUESTED; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.OPEN; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.PENDING_DECLARATION; shift: Shift; activeBusinessShifts: Shift[] }
    | { status: typeof SHIFT_STATUS.AWAITING_APPROVAL; shift: Shift; activeBusinessShifts: Shift[] }
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

            // STEP 1 — Managers/CEOs resolve all open shifts in the business
            if (isManagement && authority.businessId) {
                const { data: allShifts } = await supabase
                    .from('shifts')
                    .select('*')
                    .eq('business_id', authority.businessId)
                    .neq('status', SHIFT_STATUS.CLOSED);
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
                    case SHIFT_STATUS.PENDING_DECLARATION:
                        setShiftState({ status: SHIFT_STATUS.PENDING_DECLARATION, shift, activeBusinessShifts: businessShifts });
                        break;
                    case SHIFT_STATUS.AWAITING_APPROVAL:
                        setShiftState({ status: SHIFT_STATUS.AWAITING_APPROVAL, shift, activeBusinessShifts: businessShifts });
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
        if (user) {
            console.log('[SHIFT CONTEXT]', {
                authUser: user.id,
            });
        }
        resolveShift();
        return () => { isMounted.current = false; };
    }, [resolveShift, user]);

    const startShift = async () => {
        if (authority.status !== 'authorized' || !user) return { error: { message: 'Not authorized' } };

        console.log('[SHIFT] Initiating request_shift RPC...');
        const { data, error } = await (supabase as any).rpc('request_shift');

        if (error || !data?.success) {
            return { error: error || (data?.error ? { message: data.error } : { message: 'Failed to request shift' }) };
        }

        await resolveShift();
        return { error: null };
    };

    const endShift = async () => {
        if (!user || shiftState.status !== SHIFT_STATUS.OPEN) return { error: { message: 'No active shift to end' } };

        console.log('[SHIFT] Initiating end_shift RPC...');
        const { data, error } = await (supabase as any).rpc('end_shift');

        if (error || !data?.success) {
            return { error: error || (data?.error ? { message: data.error } : { message: 'Failed to end shift' }) };
        }

        await resolveShift();
        return { error: null };
    };

    const submitDeclaration = async ({ cash, pos, transfer }: { cash: number; pos: number; transfer: number }) => {
        // STEP 5 — DECLARATION GUARD
        const activeShift = await getActiveShift(user!.id);
        if (!activeShift || activeShift.status !== 'pending_declaration') {
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
            const data = await apiSubmitDeclaration(activeShift.id, { cash, pos, transfer });
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
        const { data, error } = await (supabase as any).rpc('approve_shift_close', {
            p_shift_id: shiftId
        });

        if (!error && data?.success) {
            await resolveShift();
            return { error: null };
        }
        return { error: error || (data?.error ? { message: data.error } : null) };
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
