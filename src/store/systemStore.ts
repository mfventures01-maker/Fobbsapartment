import { create } from 'zustand';
import { callRPC } from '../lib/rpcClient';

export function assertUUID(id: string | null | undefined, label: string) {
    if (!id || id.length < 10) {
        throw new Error(`[ANTI-GRAVITY] Invalid ${label}`);
    }
}

export type SystemState = {
    business_id: string | null;
    branch_id: string | null;
    user_id: string | null;
    orders: any; // Stats object
    revenue: any; // Revenue intelligence
    recent_transactions: any[];
    alerts: any[];
    timestamp: string | null;
};

interface SystemStore extends SystemState {
    setState: (data: SystemState) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
    business_id: null,
    branch_id: null,
    user_id: null,
    orders: { open_orders: 0, pending_payment: 0, today_total: 0 },
    revenue: { today: 0, last_hour: 0, shift_total: 0 },
    recent_transactions: [],
    alerts: [],
    timestamp: null,

    setState: (data: SystemState) => set(data),
}));

export async function hydrateSystem() {
    // 🛡️ [ANTI-GRAVITY] DETERMINISTIC HYDRATION (LAYER 5)
    // Hotel Edition: Single 'payload' JSONB ensures schema alignment.

    // Resolve context from store state OR from authority (handled by RPC internally)
    const store = useSystemStore.getState();

    const payload = {
        _idempotency_key: crypto.randomUUID(),
        branch_id: store.branch_id,
        business_id: store.business_id,
        p_terminal_type: 'staff',
        shift_id: null,
        staff_id: store.user_id,
        terminal_type: 'staff'
    };

    const data = await callRPC<SystemState>(
        "manager",
        "get_system_state",
        { payload }
    );

    useSystemStore.getState().setState(data);
}
