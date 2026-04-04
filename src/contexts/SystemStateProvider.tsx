import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { hydrateSystem, useSystemStore } from '../store/systemStore';

// Roles that need branch-level system hydration before rendering
const BRANCH_SCOPED_ROLES = ['staff', 'manager', 'kitchen'];

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();
    const [isHydrated, setIsHydrated] = useState(false);
    const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

    // 🛸 ANTI-GRAVITY: Only roles that operate within a single branch need hydration gate
    const needsBranchHydration = !!user
        && authority.hydrated
        && !!authority.role
        && BRANCH_SCOPED_ROLES.includes(authority.role)
        && !!authority.businessId
        && !!authority.branchId;

    const canHydrate = needsBranchHydration;

    console.log("[LIFECYCLE]", {
        user: user?.id,
        role: authority.role,
        businessId: authority.businessId,
        branchId: authority.branchId,
        canHydrate,
        isHydrated,
    });

    const hasStarted = useRef(false);

    // 🛸 SAFEGUARD: 3s timeout — never let a failed hydrateSystem permanently lock the UI
    useEffect(() => {
        if (!canHydrate || isHydrated) return;
        const timeout = setTimeout(() => {
            console.warn('[HYDRATION] Timeout — releasing lock to prevent dead page.');
            setHydrationTimedOut(true);
        }, 3000);
        return () => clearTimeout(timeout);
    }, [canHydrate, isHydrated]);

    useEffect(() => {
        if (!canHydrate || isHydrated) return;

        let active = true;

        const run = async () => {
            try {
                await hydrateSystem();

                if (!active) return;

                setIsHydrated(true);
                console.log("[HYDRATION] System State Hydrated Successfully!");
            } catch (err) {
                if (!active) return;
                console.error('[HYDRATION ERROR]', err);
                setHydrationTimedOut(true); // Unlock on error too
            }
        };

        run();

        return () => {
            active = false;
        };
    }, [canHydrate, isHydrated, authority.businessId, authority.branchId]);

    useEffect(() => {
        if (!isHydrated) return;
        if (hasStarted.current) return;

        hasStarted.current = true;

        function startTelemetry() {
            const unsubscribe = useSystemStore.subscribe((state) => {
                console.log("[SSOT UPDATE]", { timestamp: state.timestamp, orders: state.orders?.length });
            });
            return unsubscribe;
        }

        const unsubscribe = startTelemetry();
        return () => {
            unsubscribe();
            hasStarted.current = false;
        };
    }, [isHydrated]);

    // 🛸 RULE 1: No user (guest) → always pass through (public pages)
    if (!user) {
        return <>{children}</>;
    }

    // 🛸 RULE 2: Org-wide roles (super_admin, ceo, owner, admin) → pass through immediately
    // These roles are not branch-scoped and must never be locked by a branch gate
    if (!needsBranchHydration) {
        return <>{children}</>;
    }

    // 🛸 RULE 3: Branch-scoped role, hydration in progress → show lock
    // BUT: release after timeout or error to prevent permanent dead page
    if (!isHydrated && !hydrationTimedOut) {
        return (
            <div className="hydration-lock flex flex-col items-center justify-center p-8 bg-white h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-900 mb-4"></div>
                <p className="text-emerald-950 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing deterministic terminal...</p>
            </div>
        );
    }

    // ✅ Hydrated (or timed out) → release
    return <>{children}</>;
};
