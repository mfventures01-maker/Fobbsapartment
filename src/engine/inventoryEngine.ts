import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    branch_id?: string;
    department_id?: string;
}

interface InventoryEngine {
    items: InventoryItem[];
    loading: boolean;
    refresh: () => Promise<void>;
    // Called automatically after order completion / transfer approval
}

export const useInventoryEngine = create<InventoryEngine>((set, get) => ({
    items: [],
    loading: false,

    refresh: async () => {
        set({ loading: true });
        try {
            // Fetching from DB directly to prevent local illusion of stock
            const { data, error } = await supabase
                .from('inventory')
                .select('*');

            if (error) {
                // Handle gracefully if the exact table name is different or missing
                if (error.code !== '42P01') {
                    throw error;
                }
                console.warn('[engine] Inventory table not perfectly aligned yet or missing.');
                set({ items: [], loading: false });
                return;
            }

            set({ items: data || [], loading: false });
        } catch (e) {
            console.error('[engine] Inventory refresh exception:', e);
            set({ loading: false });
        }
    }
}));
