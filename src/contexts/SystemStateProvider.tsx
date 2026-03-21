import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { hydrateSystem, useSystemStore } from '../store/systemStore';

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();
    const [isHydrated, setIsHydrated] = useState(false);

    // LAW 2 — HYDRATION IS GATED (NO EMPTY CONTEXT)
    const canHydrate = !!user && !!authority.businessId && !!authority.branchId;

    console.log("[LIFECYCLE]", {
        user: user?.id,
        businessId: authority.businessId,
        branchId: authority.branchId,
        canHydrate,
    });

    const hasStarted = useRef(false);

    useEffect(() => {
        if (!canHydrate || isHydrated) return;

        let active = true;

        const run = async () => {
            try {
                await hydrateSystem(authority.businessId!, authority.branchId!);

                if (!active) return;

                setIsHydrated(true);
                console.log("[HYDRATION] System State Hydrated Successfully!");
            } catch (err) {
                if (!active) return;
                console.error('[HYDRATION ERROR]', err);
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

    if (!canHydrate || !isHydrated) {
        return <div className="hydration-lock flex items-center justify-center p-8 text-gray-500 font-mono text-xs uppercase tracking-widest h-screen">Initializing deterministic terminal...</div>;
    }

    return <>{children}</>;
};
