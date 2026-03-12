import { useSystemStore } from '../store/systemStore';

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
    const { state, loading, lastUpdated, refresh, error } = useSystemStore();

    // Default values to prevent runtime crashes (Anti-Gravity SSOT Rule)
    const defaults = {
        shift: null,
        orders: { open_orders: 0, pending_payment: 0, today_total: 0 },
        revenue: { today: 0, last_hour: 0, shift_total: 0 },
        payments: { pending_intents: 0, intents_list: [] },
        open_shifts: 0,
        recent_transactions: [],
        branch_performance: [],
        alerts: []
    };

    return {
        ...(state || defaults),
        loading,
        lastUpdated,
        refresh,
        error
    };
}
