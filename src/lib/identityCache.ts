// 🛰️ IDENTITY CACHE SERVICE (L0-02)
// Purpose: Bridging identity across token refresh events to prevent RPC spikes.

const CACHE_KEY = 'carss_identity_bridge_v1';

export interface CachedIdentity {
    user_id: string;
    role: any;
    business_id: string;
    branch_id: string;
    department_id: string;
    department_name: string;
    full_name: string;
    staff_id: string;
    timestamp: string;
    cached_at: number;
}

export const identityCache = {
    set: (identity: any) => {
        if (!identity || !identity.user_id) return;
        const data: CachedIdentity = {
            ...identity,
            cached_at: Date.now()
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    },
    get: (userId: string): CachedIdentity | null => {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as CachedIdentity;
            // 1. Identity Mismatch Check (Zero Trust)
            if (parsed.user_id !== userId) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            // 2. TTL Check (1 Hour)
            if (Date.now() - parsed.cached_at > 3600000) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    },
    clear: () => {
        sessionStorage.removeItem(CACHE_KEY);
    }
};
