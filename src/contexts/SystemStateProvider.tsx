import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { hydrateSystem, useSystemStore } from '../store/systemStore';
import { verifyHotelHydration } from '../utils/hotelHydrationTester';

// Roles that need branch-level system hydration before rendering
const BRANCH_SCOPED_ROLES = ['staff', 'manager', 'kitchen'];

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();
    const [isHydrated, setIsHydrated] = useState(false);

    // 🛸 ANTI-GRAVITY: Hydration is the sync of Layer 5 (System State)
    // ALL authenticated users with an authority should hydrate to populate forensics/telemetry
    const canHydrate = !!user && authority.hydrated && !!authority.role;

    // 🛸 [LOCK GATING]: Only roles that operate within a single branch MUST block UI until hydration
    const needsBranchLock = canHydrate
        && authority.role
        && BRANCH_SCOPED_ROLES.includes(authority.role)
        && !!authority.businessId
        && !!authority.branchId;

    console.log("[LIFECYCLE]", {
        user: user?.id,
        role: authority.role,
        businessId: authority.businessId,
        branchId: authority.branchId,
        canHydrate,
        isHydrated,
    });

    const hasStarted = useRef(false);

    useEffect(() => {
        if (!canHydrate || isHydrated) return;
        const timeout = setTimeout(() => {
            console.warn('[HYDRATION] Timeout — releasing lock to prevent dead page.');
            setIsHydrated(true); // Release locally to satisfy downstream
        }, 5000);
        return () => clearTimeout(timeout);
    }, [canHydrate, isHydrated]);

    useEffect(() => {
        if (!canHydrate || isHydrated) return;

        let active = true;

        const run = async () => {
            try {
                await hydrateSystem();

                if (!active) return;

                // 🏅 [ANTI-GRAVITY] STEP 6: FORENSIC VERIFICATION (HYDRATION X-RAY)
                console.log("[HYDRATION] System State Hydrated. Running forensic verification...");
                const results = await verifyHotelHydration(authority);

                // If any critical terminal fails, we don't block UNLESS it's a fatal DB error (Step 6 log only)
                console.log("[HYDRATION] Verification Matrix Results:", results);

                // 🛸 [ANTI-GRAVITY] STEP 5: EXPOSE PORTAL STATE FOR FORENSICS
                // @ts-ignore
                window.__CARSS_PORTAL_STATE__ = results;

                setIsHydrated(true);
                console.log("[HYDRATION] Portal Sealed: Fully Hydrated = true");
            } catch (err) {
                if (!active) return;
                console.error('[HYDRATION ERROR]', err);
                setIsHydrated(true);
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
    if (!needsBranchLock) {
        return <>{children}</>;
    }

    // 🛸 RULE 3: Operational Pass-Through
    // The visual lock is now managed by the Central Hydration Gate in App.tsx
    return <>{children}</>;
};
