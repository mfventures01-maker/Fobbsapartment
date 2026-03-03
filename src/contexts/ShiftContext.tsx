import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/db';

export type ShiftState =
    | { status: 'loading' }
    | { status: 'no_shift' }
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
            console.log('[SHIFT CONTEXT] Resolving for user:', user.id);

            const { data: shift, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('staff_id', user.id)
                .in('status', ['open', 'pending_declaration', 'awaiting_manager_approval'])
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (!shift) {
                if (isMounted.current) setShiftState({ status: 'no_shift' });
                return;
            }

            if (isMounted.current) {
                if (shift.status === 'open') {
                    setShiftState({ status: 'active', shift });
                } else if (shift.status === 'pending_declaration') {
                    setShiftState({ status: 'pending_declaration', shift });
                } else if (shift.status === 'awaiting_manager_approval') {
                    setShiftState({ status: 'awaiting_approval', shift });
                } else {
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
        const { businessId, branchId, departmentId } = authority;

        if (!businessId || !branchId || !departmentId) {
            return { error: { message: 'Membership context incomplete' } };
        }

        // Proactive block
        if (shiftState.status === 'active' || shiftState.status === 'pending_declaration') {
            return { error: { message: 'You have a pending shift operation.' } };
        }

        const { error } = await supabase.from('shifts').insert({
            staff_id: user.id,
            business_id: businessId,
            branch_id: branchId,
            department_id: departmentId,
            status: 'open',
            start_time: new Date().toISOString(),
            declared_cash: 0,
            declared_pos: 0,
            declared_transfer: 0
        });

        if (!error) await resolveShift();
        return { error };
    };

    const endShift = async () => {
        if (!user || shiftState.status !== 'active') return { error: { message: 'No active shift or user session' } };

        const { error } = await supabase
            .from('shifts')
            .update({
                ends_at: new Date().toISOString(),
                status: 'pending_declaration'
            })
            .eq('id', shiftState.shift.id);

        if (!error) await resolveShift();
        return { error };
    };

    const submitDeclaration = async ({ cash, pos, transfer }: { cash: number; pos: number; transfer: number }) => {
        if (!user || shiftState.status !== 'pending_declaration') return { error: { message: 'No shift pending declaration or user session' } };

        // PHASE 3 — DECLARATION SUBMISSION LOCK
        if (shiftState.shift.staff_id !== user.id) {
            console.error('[SHIFT] Ownership mismatch detected!', {
                activeStaff: shiftState.shift.staff_id,
                authUser: user.id
            });
            throw new Error('Shift ownership mismatch');
        }

        const { data, error } = await (supabase as any).rpc('submit_shift_declaration', {
            p_shift_id: shiftState.shift.id,
            p_cash: cash,
            p_pos: pos,
            p_transfer: transfer
        });

        if (!error && data?.success) {
            await resolveShift();
            return { error: null, data };
        }
        return { error: error || (data?.error ? { message: data.error } : { message: 'Submission failed' }) };
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
