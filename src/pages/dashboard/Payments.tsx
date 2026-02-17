
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { transactionService } from '@/lib/TransactionService';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { CheckCircle, AlertOctagon, Scale, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransactionRecord {
    id: string;
    amount: number;
    payment_type: string;
    status: 'created' | 'verified' | 'reversed' | 'disputed';
    payment_reference: string;
    created_at: string;
    staff_id: string;
}

const Payments: React.FC = () => {
    const { profile } = useAuth();
    const { currentBranch } = useBranch();
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPayments = async () => {
        if (!supabase || !profile?.business_id) return;
        setLoading(true);

        const branchId = currentBranch === 'all' ? null : currentBranch.id;

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false });

        if (branchId) query = query.eq('branch_id', branchId);

        const { data, error } = await query;
        if (error) {
            toast.error('Failed to load ledger.');
        } else {
            setTransactions(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();

        let unsubscribe = () => { };
        if (profile?.business_id) {
            unsubscribe = transactionService.subscribeToTransactions(profile.business_id, () => {
                fetchPayments();
            });
        }
        return () => unsubscribe();
    }, [currentBranch, profile?.business_id]);

    const handleTransition = async (id: string, newStatus: 'verified' | 'reversed' | 'disputed', reason?: string) => {
        if (!profile?.user_id) return;
        try {
            await transactionService.transitionStatus(id, newStatus, profile.user_id, reason);
            fetchPayments();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" />
                        FINANCIAL RECONCILIATION
                    </h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Master Audit Ledger • Immutable Logs</p>
                </div>
                <button onClick={fetchPayments} className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> SYNC LEDGER
                </button>
            </div>

            <div className="bg-white shadow-xl rounded-3xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs animate-pulse">Consulting Universal Ledger...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">No transactions recorded.</td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                            {new Date(tx.created_at).toLocaleDateString()}<br />
                                            {new Date(tx.created_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-black text-gray-900 tracking-tight">₦{Number(tx.amount).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-gray-900 uppercase tracking-widest">
                                            {tx.payment_type}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-400 font-mono">
                                            {tx.payment_reference || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                                                tx.status === 'created' ? 'bg-amber-100 text-amber-800' :
                                                    tx.status === 'reversed' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-rose-100 text-rose-800'
                                                }`}>
                                                {tx.status === 'created' ? 'PENDING' : tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {tx.status === 'created' && (
                                                    <button
                                                        onClick={() => handleTransition(tx.id, 'verified')}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="Verify Receipt"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {tx.status !== 'reversed' && (
                                                    <button
                                                        onClick={() => {
                                                            const reason = prompt("Reason for reversal?");
                                                            if (reason) handleTransition(tx.id, 'reversed', reason);
                                                        }}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                        title="Reverse Transaction"
                                                    >
                                                        <AlertOctagon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {tx.status !== 'disputed' && (
                                                    <button
                                                        onClick={() => handleTransition(tx.id, 'disputed')}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                                        title="Flag Dispute"
                                                    >
                                                        <Scale className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Payments;
