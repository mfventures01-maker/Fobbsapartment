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
    const state = useSystemStore();
    const { authority } = useAuth();

    // Default values matching precise backend mirror
    const defaults = {
        business_id: null,
        location_id: null,
        user_id: null,
        orders: [],
        kitchen: [],
        inventory: [],
        shifts: [],
        timestamp: null
    };

    // Note: Hydration loop moved exclusively to SystemStateProvider
    // as part of gated hydration protocol to enforce LAW 2.

    return {
        ...defaults,
        ...(state || {}),
        ceo_snapshot: null,
        loading: false, // Replaced by global or context level Loading states
        lastUpdated: state.timestamp,
        error: null,
        // Mocking refresh to avoid breaking existing signatures while protocol takes over
        refresh: async () => { console.warn("Manual refresh requested, ignored by Anti-Gravity rule."); }
    };
}

