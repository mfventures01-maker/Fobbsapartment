import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'super_admin' | 'ceo' | 'manager' | 'staff' | 'cashier' | 'storekeeper';

interface RoleContextType {
    role: UserRole | null;
    businessId: string | null;
    loading: boolean;
    error: string | null;
    refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType>({
    role: null,
    businessId: null,
    loading: true,
    error: null,
    refreshRole: async () => { },
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading: authLoading } = useAuth();
    const [role, setRole] = useState<UserRole | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setRole(profile.role as UserRole);
            setBusinessId(profile.business_id);
        } else {
            setRole(null);
            setBusinessId(null);
        }
    }, [profile]);

    return (
        <RoleContext.Provider value={{
            role,
            businessId,
            loading: authLoading,
            error: null,
            refreshRole: async () => { } // No-op as verified by auth
        }}>
            {children}
        </RoleContext.Provider>
    );
};



export const useRole = () => useContext(RoleContext);
