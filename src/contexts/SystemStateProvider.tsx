import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { hydrateSystem, useSystemStore } from '../store/systemStore';

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();

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
        if (!canHydrate) {
            console.warn("[BLOCKED] Hydration prevented due to missing context");
            return;
        }

        hydrateSystem(authority.businessId!, authority.branchId!).catch(err => {
            console.error('[HYDRATION ERROR]', err);
        });
    }, [canHydrate, authority.businessId, authority.branchId]);

    useEffect(() => {
        if (!canHydrate) return;
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
    }, [canHydrate]);

    return <>{children}</>;
};
