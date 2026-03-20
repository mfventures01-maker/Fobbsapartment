import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { hydrateSystem } from '../store/systemStore';

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, user } = useAuth();

    // LAW 2 — HYDRATION IS GATED (NO EMPTY CONTEXT)
    const canHydrate = !!user && !!authority.businessId && !!authority.branchId;

    useEffect(() => {
        if (!canHydrate) {
            console.warn("[BLOCKED] Hydration prevented due to missing context");
            return;
        }

        hydrateSystem(authority.businessId!, authority.branchId!).catch(err => {
            console.error('[HYDRATION ERROR]', err);
        });
    }, [canHydrate, authority.businessId, authority.branchId]);

    return <>{children}</>;
};
