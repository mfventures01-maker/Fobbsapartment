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

    // 🔄 AUTOMATIC SYNCHRONIZATION (Step 2: Deterministic Heartbeat Engine)
    useEffect(() => {
        // 🔒 IDENTITY GATE: No identity → No heartbeat
        if (authority.status !== 'authorized' || !authority.businessId) return;

        console.log('[SSOT] 🛰️ Booting High-Res Telemetry Engine...');

        // Immediate hydrate
        refresh(authority.businessId, authority.branchId || '');

        // ⏱️ Mirror Pulse: 4-second polling (Controlled Truth Refresh Loop)
        const interval = setInterval(() => {
            refresh(authority.businessId || '', authority.branchId || '');
        }, 4000);

        return () => clearInterval(interval);
    }, [authority.status, authority.businessId, authority.branchId, refresh]);

    return {
        ...defaults,
        ...(state || {}),
        ceo_snapshot: state?.ceo_snapshot || null,
        loading,
        lastUpdated,
        refresh,
        error
    };
}
