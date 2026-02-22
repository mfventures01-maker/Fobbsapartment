import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'super_admin' | 'ceo' | 'manager' | 'staff';

interface RoleContextType {
    role: UserRole | null;
    businessId: string | null;
    loading: boolean;
    error: string | null;
    setOverrideBusinessId: (id: string | null) => void;
}

const RoleContext = createContext<RoleContextType>({
    role: null,
    businessId: null,
    loading: true,
    error: null,
    setOverrideBusinessId: () => { },
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading: authLoading } = useAuth();
    const [overrideBusinessId, setOverrideBusinessId] = React.useState<string | null>(null);

    const role = profile?.role as UserRole | null;

    // Super-admin can override business ID to view different businesses
    const businessId = (role === 'super_admin')
        ? (overrideBusinessId || null)
        : (profile?.business_id || null);

    return (
        <RoleContext.Provider value={{
            role,
            businessId,
            loading: authLoading,
            error: null,
            setOverrideBusinessId
        }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => useContext(RoleContext);
