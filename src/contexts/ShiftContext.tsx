import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/db';
import { getActiveShift, submitShiftDeclaration as apiSubmitDeclaration } from '../lib/shiftService';

export type ShiftState =
    | { status: 'loading' }
    | { status: 'no_shift' }
    | { status: 'awaiting_opening'; shift: Shift }
    | { status: 'active'; shift: Shift }
    | { status: 'pending_declaration'; shift: Shift }
    | { status: 'awaiting_approval'; shift: Shift }
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

        const { role } = authority;

        // CEO/SuperAdmin/Owner do not require active shifts for terminal access
        if (role === 'super_admin' || role === 'ceo' || role === 'owner') {
            if (isMounted.current) setShiftState({ status: 'no_shift' });
            return;
        }

        try {
            console.log('[SHIFT CONTEXT] Resolving via ANTI-GRAVITY engine...');

            // STEP 1 — Database is the only authority
            const shift = await getActiveShift(user.id);

            if (!shift) {
                if (isMounted.current) setShiftState({ status: 'no_shift' });
                return;
            }

            // STEP 3 — UI State orbit around DB state
            if (isMounted.current) {
                switch (shift.status) {
                    case 'awaiting_manager_open':
                        setShiftState({ status: 'awaiting_opening', shift });
                        break;
                    case 'open':
                        setShiftState({ status: 'active', shift });
                        break;
                    case 'pending_declaration':
                        setShiftState({ status: 'pending_declaration', shift });
                        break;
                    case 'awaiting_manager_approval':
                        setShiftState({ status: 'awaiting_approval', shift });
                        break;
                    case 'closed':
                        setShiftState({ status: 'no_shift' });
                        break;
                    default:
                        setShiftState({ status: 'no_shift' });
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

        console.log('[SHIFT] Initiating start_shift RPC...');
        const { data, error } = await (supabase as any).rpc('start_shift');

        if (error || !data?.success) {
            return { error: error || (data?.error ? { message: data.error } : { message: 'Failed to start shift' }) };
        }

        await resolveShift();
        return { error: null };
    };

    const endShift = async () => {
        if (!user || shiftState.status !== 'active') return { error: { message: 'No active shift to end' } };

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
        const { data, error } = await (supabase as any).rpc('approve_shift', {
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
