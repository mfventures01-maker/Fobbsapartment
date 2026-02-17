import React, { createContext, useContext } from 'react';
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

    // Derive synchronously to avoid render flash
    const role = profile?.role as UserRole | null;
    const businessId = profile?.business_id || null;

    return (
        <RoleContext.Provider value={{
            role,
            businessId,
            loading: authLoading, // Loading follows Auth loading EXACTLY
            error: null,
            refreshRole: async () => { } // No-op
        }}>
            {children}
        </RoleContext.Provider>
    );
};



export const useRole = () => useContext(RoleContext);
