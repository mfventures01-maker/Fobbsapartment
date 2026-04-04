
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
            if (!authority.hydrated || authority.status !== 'authorized' || !authority.businessId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fix 3: Branch Resolution
                const loadBranches = async () => {
                    const res = await callRPC<any>('public', 'get_my_branches', {
                        _idempotency_key: crypto.randomUUID()
                    });
                    return res?.branches || [];
                };

                const mappedBranches = (await loadBranches()).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    location: b.address || b.location
                }));

                setBranches(mappedBranches);

                if (!authority.branchId && mappedBranches.length > 0) {
                    const firstBranch = mappedBranches[0];
                    setCurrentBranch(firstBranch);
                    // Important: The user code assumed updateAuthority existed. I'll rely on setCurrentBranch for now or external logic updating authority.
                } else if (authority.branchId && mappedBranches.length > 0) {
                    const myBranch = mappedBranches.find((b: any) => b.id === authority.branchId);
                    if (myBranch) setCurrentBranch(myBranch);
                }
            } catch (err) {
                console.error('[CARSS-FINTECH] Branch discovery failed via RPC:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, [authority.status, authority.businessId, authority.branchId]);

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
