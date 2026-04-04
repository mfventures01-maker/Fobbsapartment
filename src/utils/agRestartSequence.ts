/**
 * 🛸 CARSS AG RESTART SEQUENCE (FRONTEND CACHE CLEAR)
 * 
 * Purpose: Clears all browser-side portal state, identity cache, and 
 * store variables to force a clean re-hydration from a verified session.
 */

import { useSystemStore } from '@/store/systemStore';

export const initiateAgFrontendReset = () => {
    console.log("🛸 AG RESTART SEQUENCE: FRONTEND CACHE PURGE (Step 4)...");

    // 1. Clear Supabase Persistence & Identity Cache
    for (const key in localStorage) {
        if (key.includes('supabase') || key.includes('identity-cache')) {
            localStorage.removeItem(key);
        }
    }

    // 2. Clear Session Portal Variables
    // @ts-ignore
    window.__CARSS_PORTAL_STATE__ = null;
    // @ts-ignore
    window.canHydrate = false;

    // 3. Reset System Store
    // @ts-ignore
    useSystemStore.getState().setState({
        orders: null,
        revenue: null,
        recent_transactions: [],
        alerts: [],
        timestamp: null,
        business_id: null,
        branch_id: null,
        user_id: null
    });

    console.log("🛸 CACHE PURGED. RE-HYDRATION GATE CLOSED. (Step 4 ✅)");
};

/**
 * ⚡ AG DIRECTIVE: FORCE_HYDRATION (Step 5)
 * Triggers a global event that AuthContext / SystemProvider can listen to.
 */
export const forcePortalRehydration = () => {
    console.log("⚡ AG DIRECTIVE: TRIGGERING FORCE_HYDRATION (Step 5)...");
    window.dispatchEvent(new CustomEvent('FORCE_HYDRATION'));
};
