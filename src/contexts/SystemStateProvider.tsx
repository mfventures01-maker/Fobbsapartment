import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSystemStore } from '../store/systemStore';
import { presenceService } from '../services/presenceService';

export const SystemStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authority, staffId } = useAuth();
    const { hydrate, subscribe } = useSystemStore();
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const isGlobalRole = authority.role && ['ceo', 'owner', 'super_admin'].includes(authority.role);

        if (authority.status === 'authorized' && authority.businessId && (authority.branchId || isGlobalRole)) {
            console.log('[SYSTEM PROVIDER] Initializing Location-Scoped State Hydration...', {
                business: authority.businessId,
                branch: authority.branchId || 'GLOBAL'
            });

            hydrate(authority.businessId, authority.branchId || undefined);

            // REALTIME TERMINAL PRESENCE (Anti-Gravity Upgrade)
            if (staffId) {
                const terminal_type = (['ceo', 'owner', 'super_admin'].includes(authority.role || '')) ? 'ceo_terminal' :
                    (authority.role === 'manager') ? 'manager_terminal' : 'staff_terminal';

                const device_info = `${navigator.platform} (${navigator.vendor || 'Unknown Browser'})`;

                presenceService.registerPresence({
                    staff_id: staffId,
                    business_id: authority.businessId,
                    branch_id: authority.branchId || '00000000-0000-0000-0000-000000000000',
                    terminal_type,
                    device_info
                });

                // Start 60s Heartbeat (Presence Safety)
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                heartbeatRef.current = setInterval(() => {
                    presenceService.sendHeartbeat(staffId, terminal_type);
                }, 60000);
            }

            // Subscribe only if branchId is present (for realtime operational filters)
            if (authority.branchId) {
                const unsubscribe = subscribe(authority.businessId, authority.branchId);
                return () => {
                    console.log('[SYSTEM PROVIDER] Cleaning up Telemetry & Presence');
                    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                    if (staffId) {
                        const terminal_type = (['ceo', 'owner', 'super_admin'].includes(authority.role || '')) ? 'ceo_terminal' :
                            (authority.role === 'manager') ? 'manager_terminal' : 'staff_terminal';
                        presenceService.disconnect(staffId, terminal_type);
                    }
                    unsubscribe();
                };
            }
        }

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [authority, staffId, hydrate, subscribe]);

    return <>{children}</>;
};
