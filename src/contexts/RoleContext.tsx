import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

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
    refreshRole: async () => { }, // Placeholder
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<UserRole | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    const fetchUserRole = async () => {
        setLoading(true);
        setError(null);

        // Timeout Promise to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Role fetch timed out')), 8000)
        );

        try {
            const fetchPromise = (async () => {
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) throw userError;

                if (!user) {
                    setRole(null);
                    setBusinessId(null);
                    return;
                }

                console.log("Fetching role for user:", user.id);

                // Query business_memberships table
                const { data: memberships, error: membershipError } = await supabase
                    .from('business_memberships')
                    .select('role, business_id')
                    .eq('user_id', user.id);

                if (membershipError) {
                    throw membershipError;
                }

                if (memberships && memberships.length > 0) {
                    const membership = memberships[0];
                    console.log("--------------------------------------------------");
                    console.log("RoleContext Fetched Authority:");
                    console.log("role:", membership.role);
                    console.log("business_id:", membership.business_id);
                    console.log("--------------------------------------------------");

                    setRole(membership.role as UserRole);
                    setBusinessId(membership.business_id);
                } else {
                    console.warn("RoleContext: No membership found for user", user.id);
                    setRole(null);
                    setBusinessId(null);
                }
            })();

            await Promise.race([fetchPromise, timeoutPromise]);

        } catch (err: any) {
            console.error("Error fetching user role:", err);
            setError(err.message || 'Failed to fetch user role');
            // Don't clear role completely on error if we want persistence, 
            // but here we default to null to fail safe.
            setRole(null);
            setBusinessId(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchUserRole();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[RoleContext] Auth event: ${event}`);
            setSession(session);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchUserRole();
            } else if (event === 'SIGNED_OUT') {
                setRole(null);
                setBusinessId(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <RoleContext.Provider value={{ role, businessId, loading, error, refreshRole: fetchUserRole }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => useContext(RoleContext);
