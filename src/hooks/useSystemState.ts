import { useSystemStore, hydrateSystem } from '../store/systemStore';

/**
 * useSystemState Hook - Phase 2 SSOT Enforcement
 * 
 * This hook is the canonical entry point for all operational metrics.
 * It provides a direct view into the SystemStore, which is hydrated by get_system_state RPC.
 * 
 * NO BUSINESS CALCULATIONS PROHIBITED.
 * All metrics must be read directly from the state object.
 */
export function useSystemState() {
    const state = useSystemStore();

    // Default values matching precise backend mirror
    const defaults = {
        business_id: null,
        branch_id: null,
        user_id: null,
        orders: { open_orders: 0, pending_payment: 0, today_total: 0 },
        revenue: { today: 0, last_hour: 0, shift_total: 0 },
        recent_transactions: [],
        alerts: [],
        timestamp: null
    };

    return {
        ...defaults,
        ...(state || {}),
        ceo_snapshot: null,
        loading: false,
        lastUpdated: state.timestamp,
        error: null,
        // Aligned with Phase 5 deterministic refresh (parameterless)
        refresh: async () => {
            await hydrateSystem();
        }
    };
}

