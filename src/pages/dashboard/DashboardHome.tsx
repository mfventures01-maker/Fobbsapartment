
import React, { useState, useEffect } from 'react';
import { Clock, Shield, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { transactionService, Transaction } from '@/lib/TransactionService';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

const DashboardHome: React.FC = () => {
    const { profile } = useAuth();
    const { currentBranch } = useBranch();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineCount, setOfflineCount] = useState(0);

    const fetchLiveStats = async () => {
        if (!supabase || !profile?.business_id) return;
        setLoading(true);
        const branchId = currentBranch === 'all' ? null : currentBranch.id;

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (branchId) query = query.eq('branch_id', branchId);

        const { data, error } = await query;
        if (!error) setTransactions(data || []);

        setOfflineCount(transactionService.getOfflineCount());
        setLoading(false);
    };

    useEffect(() => {
        fetchLiveStats();
        const interval = setInterval(() => {
            setIsOnline(navigator.onLine);
            setOfflineCount(transactionService.getOfflineCount());
        }, 3000);

        let unsubscribe = () => { };
        if (profile?.business_id) {
            unsubscribe = transactionService.subscribeToTransactions(profile.business_id, () => {
                fetchLiveStats();
            });
        }

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [currentBranch, profile?.business_id]);

    const handleEmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const type = formData.get('type') as any;
        const amount = Number(formData.get('amount'));

        if (!profile?.business_id || currentBranch === 'all') {
            toast.error("Please select a specific branch to record transactions.");
            return;
        }

        const tx: Omit<Transaction, 'status'> = {
            business_id: profile.business_id,
            branch_id: currentBranch.id,
            staff_id: profile.user_id,
            department_id: profile.department || 'general',
            amount: amount,
            payment_type: type.toLowerCase(),
            payment_reference: `REF-${Math.floor(Math.random() * 9999)}`
        };

        const result = await transactionService.createTransaction(tx);
        if (result.success) {
            fetchLiveStats();
            (e.target as HTMLFormElement).reset();
        }
    };

    return (
        <div className="space-y-6">
            {/* Resilience Status */}
            <div className={`p-4 rounded-2xl flex items-center justify-between border-l-4 ${isOnline ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-500'}`}>
                <div className="flex items-center gap-3">
                    {isOnline ? <Wifi className="text-emerald-500" /> : <WifiOff className="text-rose-500" />}
                    <div>
                        <p className={`text-sm font-bold ${isOnline ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {isOnline ? 'Network Stable' : 'Offline Resilience Mode Active'}
                        </p>
                        <p className="text-xs opacity-70">
                            {isOnline ? 'Transactions are being recorded directly to cloud ledger.' : 'Transactions will be stored locally and synced when connection returns.'}
                        </p>
                    </div>
                </div>
                {offlineCount > 0 && (
                    <div className="bg-white px-3 py-1 rounded-full border border-amber-200 text-amber-700 text-xs font-black">
                        {offlineCount} PENDING SYNC
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transaction Entry */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow-xl rounded-3xl border border-gray-100 overflow-hidden">
                        <div className="p-6 bg-gray-900 text-white">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Shield className="w-5 h-5 text-emerald-400" />
                                STAFF TERMINAL
                            </h2>
                            <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">Audit-First Write Logic</p>
                        </div>
                        <form onSubmit={handleEmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                                <select name="type" className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold text-gray-900">
                                    <option value="POS">POS (Machine)</option>
                                    <option value="TRANSFER">Bank Transfer</option>
                                    <option value="CASH">Physical Cash</option>
                                    <option value="CARD">Manual Card</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount (₦)</label>
                                <input name="amount" type="number" step="0.01" defaultValue="5000" className="w-full bg-gray-50 border-none rounded-xl p-3 font-black text-xl text-gray-900" />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                            >
                                Secure Transaction
                            </button>
                            <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 p-3 rounded-xl">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Transactions are immutable. Every action creates a permanent audit log entry for the CEO.</span>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Audit Feed */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow-sm rounded-3xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Recent Audit Feed</h3>
                            <button onClick={fetchLiveStats} className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline">Refresh Ledger</button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {loading ? (
                                <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase animate-pulse">Synchronizing Ledger...</div>
                            ) : transactions.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase">No records found for this shift.</div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-2xl ${tx.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 tracking-tight capitalize">{tx.payment_type} RECORDED</p>
                                                <p className="text-xs font-bold text-gray-500">₦{tx.amount.toLocaleString()} • Ref: {tx.payment_reference}</p>
                                                <div className="text-[10px] font-medium text-gray-300 uppercase mt-1">ID: {tx.id.slice(0, 8)}... • {new Date(tx.created_at).toLocaleTimeString()}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                                tx.status === 'created' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
