
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface Branch {
    id: string;
    name: string;
    location: string;
}

interface BranchContextType {
    currentBranch: Branch | 'all';
    setBranch: (branch: Branch | 'all') => void;
    branches: Branch[];
    loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | 'all'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            // Ensure supabase client and business_id are available before proceeding
            if (!supabase || !profile?.business_id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('branches')
                    .select('id, name, city')
                    .eq('business_id', profile.business_id);

                if (error) throw error;

                const mappedBranches = (data || []).map(b => ({
                    id: b.id,
                    name: b.name,
                    location: b.city
                }));

                setBranches(mappedBranches);

                // Set default branch if not 'all'
                if (mappedBranches.length > 0 && currentBranch === 'all') {
                    // we keep 'all' as default for CEO, but could auto-select first for staff
                    if (profile.role === 'staff' || profile.role === 'manager') {
                        const myBranch = mappedBranches.find(b => b.id === (profile as any).branch_id);
                        if (myBranch) setCurrentBranch(myBranch);
                    }
                }
            } catch (err) {
                console.error('[CARSS-FINTECH] Branch discovery failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, [profile?.business_id]);

    return (
        <BranchContext.Provider value={{
            currentBranch,
            setBranch: setCurrentBranch,
            branches,
            loading
        }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
};
