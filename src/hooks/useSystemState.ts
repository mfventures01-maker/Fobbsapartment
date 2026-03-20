import { useEffect } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useAuth } from '../contexts/AuthContext';

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
    const { authority } = useAuth();

    // Default values to prevent runtime crashes (Anti-Gravity SSOT Rule)
    const defaults = {
        shift: null,
        orders: { open_orders: 0, pending_payment: 0, today_total: 0 },
        revenue: { today: 0, last_hour: 0, shift_total: 0, shift_cash: 0, shift_pos: 0, shift_transfer: 0 },
        payments: { pending_intents: 0, intents_list: [] },
        open_shifts: 0,
        active_terminals: 0,
        recent_transactions: [],
        branch_performance: [],
        inventory_alerts: [],
        alerts: []
    };

    // 🔄 AUTOMATIC SYNCHRONIZATION (Rule 4: Zero-Drift Mirror)
    useEffect(() => {
        if (!authority.businessId) return;

        // Immediate hydrate
        refresh(authority.businessId, authority.branchId || '');

        // ⏱️ Mirror Pulse: 5-second polling for High-Authority / Operational Monitoring
        const interval = setInterval(() => {
            refresh(authority.businessId, authority.branchId || '');
        }, 5000);

        return () => clearInterval(interval);
    }, [authority.businessId, authority.branchId, refresh]);

    return {
        ...defaults,
        ...(state || {}),
        loading,
        lastUpdated,
        refresh,
        error
    };
}
