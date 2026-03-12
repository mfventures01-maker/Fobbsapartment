import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSystemStore } from '../store/systemStore';

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority } = useAuth();
    const { hydrate, subscribe } = useSystemStore();

    useEffect(() => {
        const isGlobalRole = authority.role && ['ceo', 'owner', 'super_admin'].includes(authority.role);

        if (authority.status === 'authorized' && authority.businessId && (authority.branchId || isGlobalRole)) {
            console.log('[SYSTEM PROVIDER] Initializing Location-Scoped State Hydration...', {
                business: authority.businessId,
                branch: authority.branchId || 'GLOBAL'
            });

            hydrate(authority.businessId, authority.branchId || '');

            // Subscribe only if branchId is present (for realtime operational filters)
            // Global roles might need a different subscription strategy or they subscribe to multiple.
            // For now, if branchId is missing, we skip filtered subscriptions or subscribe to business-level.
            if (authority.branchId) {
                const unsubscribe = subscribe(authority.businessId, authority.branchId);
                return () => {
                    console.log('[SYSTEM PROVIDER] Cleaning up Telemetry');
                    unsubscribe();
                };
            }
        }
    }, [authority, hydrate, subscribe]);

    return <>{children}</>;
};
