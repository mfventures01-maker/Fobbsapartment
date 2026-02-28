import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface Shift {
    id: string;
    staff_id: string;
    department_id?: string;
    business_id?: string;
    start_time: string;
    ends_at: string | null;
    opening_balance?: number;
}

interface ShiftEngine {
    activeShift: Shift | null;
    isShiftOpen: boolean;
    loading: boolean;
    initShift: (userId: string) => Promise<void>;
    openShift: (userId: string, data?: Partial<Shift>) => Promise<void>;
    closeShift: (shiftId: string, closingData?: any) => Promise<void>;
    refresh: () => Promise<void>;
}

export const useShiftEngine = create<ShiftEngine>((set, get) => ({
    activeShift: null,
    isShiftOpen: false,
    loading: true,

    initShift: async (userId: string) => {
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('staff_id', userId)
                .is('ends_at', null)
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            set({
                activeShift: data || null,
                isShiftOpen: !!data && !data.ends_at,
                loading: false
            });
        } catch (error) {
            console.error('[engine] Failed to init shift:', error);
            set({ loading: false });
        }
    },

    refresh: async () => {
        const { activeShift } = get();
        if (!activeShift) return;
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', activeShift.id)
                .maybeSingle();

            if (error) throw error;
            set({
                activeShift: data || null,
                isShiftOpen: !!data && !data.ends_at,
                loading: false
            });
        } catch (e) {
            console.error('[engine] Shift refresh failed:', e);
            set({ loading: false });
        }
    },

    openShift: async (userId: string, data: Partial<Shift> = {}) => {
        set({ loading: true });
        try {
            const payload: any = {
                staff_id: userId,
                ...data
            };
            // Prevent explicit null start_time overwrite if defined in component
            const { data: shiftData, error } = await supabase
                .from('shifts')
                .insert(payload)
                .select('*')
                .single();

            if (error) throw error;
            set({
                activeShift: shiftData,
                isShiftOpen: true,
                loading: false
            });
            await get().refresh();
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    },

    closeShift: async (shiftId: string, closingData: any = {}) => {
        set({ loading: true });
        try {
            const { error } = await supabase
                .from('shifts')
                .update({
                    ends_at: new Date().toISOString(),
                    ...closingData
                })
                .eq('id', shiftId);

            if (error) throw error;

            set({
                activeShift: null,
                isShiftOpen: false,
                loading: false
            });
            await get().refresh();
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    }
}));
