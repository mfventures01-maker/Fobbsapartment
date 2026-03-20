
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { callRPC } from '@/lib/rpcClient';
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
    const { authority } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | 'all'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            if (authority.status !== 'authorized' || !authority.businessId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // ✅ Step 1: Eliminate Direct Table Access (Purification Protocol)
                const data = await callRPC<any>('public', 'get_my_branches', {
                    _idempotency_key: crypto.randomUUID()
                });

                const mappedBranches = (data?.branches || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    location: b.location
                }));

                setBranches(mappedBranches);

                // Set default branch if not 'all'
                if (mappedBranches.length > 0 && currentBranch === 'all') {
                    if (authority.role === 'staff' || authority.role === 'manager' || authority.role === 'kitchen') {
                        const myBranch = mappedBranches.find((b: any) => b.id === authority.branchId);
                        if (myBranch) setCurrentBranch(myBranch);
                    }
                }
            } catch (err) {
                console.error('[CARSS-FINTECH] Branch discovery failed via RPC:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, [authority.status, authority.businessId, authority.branchId, authority.role]);

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
