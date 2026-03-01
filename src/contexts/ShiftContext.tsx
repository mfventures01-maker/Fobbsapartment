import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Shift } from '../types/db';

export type ShiftState =
    | { status: 'loading' }
    | { status: 'no_shift' }
    | { status: 'active'; shift: Shift }
    | { status: 'error'; error: string };

interface ShiftContextType {
    shiftState: ShiftState;
    refreshShift: () => Promise<void>;
    startShift: () => Promise<{ error: any }>;
    endShift: (reconciliationData: any) => Promise<{ error: any }>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();
    const [shiftState, setShiftState] = useState<ShiftState>({ status: 'loading' });

    const resolveShift = useCallback(async () => {
        if (authority.status !== 'authorized' || !user) {
            setShiftState({ status: 'loading' });
            return;
        }

        const { role } = authority;

        // Phase 1 Rules: Shift not required for CEO/SuperAdmin
        if (role === 'super_admin' || role === 'ceo' || role === 'owner') {
            setShiftState({ status: 'no_shift' });
            return;
        }

        console.log('[SHIFT] Resolving shift for:', user.id);

        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('staff_id', user.id)
                .is('ends_at', null)
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[SHIFT] Resolve Error:', error);
                setShiftState({ status: 'error', error: error.message });
                return;
            }

            if (data) {
                console.log('[SHIFT] Active shift found:', data.id);
                setShiftState({ status: 'active', shift: data });
            } else {
                console.log('[SHIFT] No active shift found.');
                setShiftState({ status: 'no_shift' });
            }
        } catch (err: any) {
            setShiftState({ status: 'error', error: err.message });
        }
    }, [authority, user]);

    useEffect(() => {
        resolveShift();
    }, [resolveShift]);

    const startShift = async () => {
        if (authority.status !== 'authorized' || !user) return { error: { message: 'Not authorized' } };

        const { businessId, departmentId } = authority;

        const { error } = await supabase
            .from('shifts')
            .insert({
                staff_id: user.id,
                business_id: businessId,
                department_id: departmentId,
                start_time: new Date().toISOString()
            })
            .select()
            .single();

        if (!error) {
            await resolveShift();
        }
        return { error };
    };

    const endShift = async (_reconciliationData: any) => {
        if (shiftState.status !== 'active') return { error: { message: 'No active shift' } };

        const { error } = await supabase
            .from('shifts')
            .update({
                ends_at: new Date().toISOString()
            })
            .eq('id', shiftState.shift.id);

        if (!error) {
            await resolveShift();
        }
        return { error };
    };

    return (
        <ShiftContext.Provider value={{
            shiftState,
            refreshShift: resolveShift,
            startShift,
            endShift
        }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShiftState = () => {
    const context = useContext(ShiftContext);
    if (context === undefined) {
        throw new Error('useShiftState must be used within a ShiftProvider');
    }
    return context;
};
