import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import {
    Clock, ShoppingBag, Landmark,
    ChevronRight, Building2,
    XCircle, CheckCircle,
    Activity, RefreshCw, TrendingUp,
    ShieldCheck, CreditCard, Package, Users, AlertTriangle
} from 'lucide-react';
import { SHIFT_STATUS } from '@/constants/shiftStatus';
import toast from 'react-hot-toast';
import { Shift, Transaction, InventoryItem, PaymentIntent } from '@/types/db';

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${color.bg} ${color.text}`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
    </div>
);

const InventoryRow = ({ item }: { item: any }) => {
    const stockPercent = Math.min(100, (item.current_stock / (item.min_stock * 3)) * 100);
    const status = item.current_stock <= 0 ? 'critical' : item.current_stock < item.min_stock ? 'low' : 'healthy';

    const colors = {
        healthy: 'bg-emerald-500',
        low: 'bg-amber-500',
        critical: 'bg-rose-500'
    };

    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                    <span className={`text-[10px] font-black uppercase ${status === 'healthy' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.current_stock} remaining
                    </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${colors[status]}`}
                        style={{ width: `${stockPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

const ReconciliationRow = ({ label, expected, declared }: { label: string, expected: number | undefined, declared: number | undefined }) => {
    const safeExpected = expected || 0;
    const safeDeclared = declared || 0;
    const diff = safeDeclared - safeExpected;
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-4 font-bold text-slate-700 text-xs">{label}</td>
            <td className="px-6 py-4 text-right font-mono text-xs">₦{Number(safeExpected).toLocaleString()}</td>
            <td className="px-6 py-4 text-right font-mono text-xs">₦{Number(safeDeclared).toLocaleString()}</td>
            <td className={`px-6 py-4 text-right font-mono text-xs font-black ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {diff === 0 ? '-' : `₦${diff.toLocaleString()}`}
            </td>
        </tr>
    );
};

const ManagerCommandCenter: React.FC = () => {
    const { authority } = useAuth();
    const { shiftState, refreshShift, approveShift } = useShiftState();

    // --- STATE ---
    const [stats, setStats] = useState({
        ordersToday: 0,
        revenueToday: 0,
        openOrders: 0,
        activeStaffCount: 0
    });

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingIntents, setPendingIntents] = useState<PaymentIntent[]>([]);
    const [pendingShifts, setPendingShifts] = useState<Shift[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- HYDRATION ---
    const hydrate = useCallback(async () => {
        if (!authority.businessId) return;
        setLoading(true);

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Stats
            const { data: ordToday } = await supabase.from('orders').select('id').eq('org_id', authority.businessId).gte('created_at', today);
            const { data: ordOpen } = await supabase.from('orders').select('id').eq('org_id', authority.businessId).eq('status', 'open');
            const { data: txToday } = await supabase.from('transactions').select('amount').eq('business_id', authority.businessId).gte('created_at', today);

            setStats({
                ordersToday: ordToday?.length || 0,
                revenueToday: txToday?.reduce((acc, t) => acc + Number(t.amount), 0) || 0,
                openOrders: ordOpen?.length || 0,
                activeStaffCount: 'activeBusinessShifts' in shiftState ? shiftState.activeBusinessShifts.length : 0
            });

            // 2. Settlement Feed
            const { data: txList } = await supabase
                .from('transactions')
                .select('*')
                .eq('business_id', authority.businessId)
                .order('created_at', { ascending: false })
                .limit(10);
            setTransactions(txList || []);

            // 3. Pending Payment Queue (The Integrity Gate)
            const { data: intentList } = await supabase
                .from('payment_intents')
                .select('*, order:orders(customer_name, table_reference)')
                .eq('org_id', authority.businessId)
                .eq('status', 'pending');
            setPendingIntents(intentList || []);

            // 4. Pending Shifts (Operational Gate Monitoring)
            // We monitor two states: 
            // - 'requested': Staff wants to open a shift (Gate A)
            // - 'awaiting_approval': Staff has declared totals and wants to close (Gate B)
            // Now derived from ShiftContext
            const businessShifts = 'activeBusinessShifts' in shiftState ? shiftState.activeBusinessShifts : [];
            const pending = businessShifts.filter(s =>
                s.status === SHIFT_STATUS.REQUESTED ||
                s.status === SHIFT_STATUS.AWAITING_APPROVAL
            );
            setPendingShifts(pending);

            // 5. Inventory and Shift Alignment
            const { data: invList } = await supabase
                .from('inventory')
                .select('*')
                .eq('business_id', authority.businessId)
                .order('current_stock', { ascending: true });
            setInventory(invList || []);

            // activeShifts is now derived from ShiftContext for the entire business
            setActiveShifts('activeBusinessShifts' in shiftState ? shiftState.activeBusinessShifts : []);

            // 6. Alert Logic
            const newAlerts = [];
            if (invList?.some(i => i.current_stock < i.min_stock)) {
                newAlerts.push({ type: 'inventory', message: 'Critical low stock detected' });
            }
            if (intentList && intentList.length > 5) {
                newAlerts.push({ type: 'security', message: `${intentList.length} payments awaiting manual verification` });
            }
            txList?.forEach(tx => {
                if (tx.amount > 100000) newAlerts.push({ type: 'security', message: `High value ${tx.payment_type} detected: ₦${tx.amount.toLocaleString()}` });
            });
            if (pending.length > 0) {
                newAlerts.push({ type: 'security', message: `${pending.length} Shift approvals pending verification` });
            }
            setAlerts(newAlerts);

        } catch (err) {
            console.error('[MANAGER] Hydrate error:', err);
        } finally {
            setLoading(false);
        }
    }, [authority.businessId]);

    useEffect(() => {
        hydrate();

        const channel = supabase.channel('manager-command-center-intensive')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_intents' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                hydrate();
                refreshShift();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [hydrate, refreshShift]);

    // --- ACTIONS ---
    const handlePaymentApprove = async (id: string) => {
        const ref = window.prompt('Enter Reference (Optional):');
        const loading = toast.loading('Confirming Settlement...');
        try {
            const { data, error } = await (supabase as any).rpc('confirm_payment_intent', {
                p_intent_id: id,
                p_external_reference: ref || ''
            });
            if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed');
            toast.success('Payment Verified', { id: loading });
            hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    const handlePaymentReject = async (id: string) => {
        const reason = window.prompt('Enter rejection reason:');
        if (!reason) return;
        const loading = toast.loading('Rejecting Intent...');
        try {
            const { data, error } = await (supabase as any).rpc('reject_payment_intent', {
                p_intent_id: id,
                p_reason: reason
            });
            if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed');
            toast.success('Payment Rejected', { id: loading });
            hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    const handleShiftApprove = async (shiftId: string) => {
        if (!window.confirm('Verify reconciliation and close shift?')) return;
        const loading = toast.loading('Closing Shift...');
        const { error } = await approveShift(shiftId);
        if (error) toast.error(error.message, { id: loading });
        else {
            toast.success('Shift Closed Successfully', { id: loading });
            hydrate();
        }
    };

    const handleShiftOpen = async (shiftId: string) => {
        const loading = toast.loading('Opening Shift...');
        const { data, error } = await (supabase as any).rpc('approve_shift_open', { p_shift_id: shiftId });
        if (error || !data?.success) toast.error(error?.message || data?.error || 'Failed to open', { id: loading });
        else {
            toast.success('Shift Opened', { id: loading });
            hydrate();
        }
    };

    const handleShiftRejectOpen = async (shiftId: string) => {
        const reason = window.prompt('Reason for rejection:');
        if (!reason) return;
        const loading = toast.loading('Rejecting Request...');
        const { data, error } = await (supabase as any).rpc('reject_shift_open', { p_shift_id: shiftId, p_reason: reason });
        if (error || !data?.success) toast.error(error?.message || data?.error || 'Failed to reject', { id: loading });
        else {
            toast.success('Shift Request Rejected', { id: loading });
            hydrate();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 space-y-8">

            {/* 1. TOP COMMAND BAR */}
            <header className="bg-white border-b border-slate-100 p-6 sticky top-0 z-40 shadow-sm backdrop-blur-xl bg-white/80">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-950 rounded-[1.5rem] shadow-xl shadow-emerald-900/20">
                            <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">Manager Command Center</h1>
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                                {authority.departmentName || 'Operations'} Terminal
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-6 px-6 py-2.5 rounded-[1.5rem] border ${('activeBusinessShifts' in shiftState && shiftState.activeBusinessShifts.length > 0) ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Service State</p>
                                <p className={`text-xs font-black uppercase ${('activeBusinessShifts' in shiftState && shiftState.activeBusinessShifts.length > 0) ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {('activeBusinessShifts' in shiftState && shiftState.activeBusinessShifts.length > 0) ? 'Live' : 'Offline'}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Active Terminals</p>
                                <p className="text-xs font-black text-slate-800">
                                    {'activeBusinessShifts' in shiftState ? shiftState.activeBusinessShifts.length : 0}
                                </p>
                            </div>
                        </div>
                        <button onClick={hydrate} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all">
                            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 space-y-8">

                {/* 2. LIVE OPERATIONS OVERVIEW */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Revenue Today" value={`₦${stats.revenueToday.toLocaleString()}`} icon={Landmark} color={{ bg: 'bg-emerald-100', text: 'text-emerald-700' }} trend="+12.5%" />
                    <StatCard title="Daily Orders" value={stats.ordersToday} icon={ShoppingBag} color={{ bg: 'bg-indigo-100', text: 'text-indigo-700' }} />
                    <StatCard title="Open Orders" value={stats.openOrders} icon={Clock} color={{ bg: 'bg-amber-100', text: 'text-amber-700' }} />
                    <StatCard title="Operational Load" value={`${Math.min(100, (stats.openOrders / 10) * 100).toFixed(0)}%`} icon={Users} color={{ bg: 'bg-rose-100', text: 'text-rose-700' }} />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: Approvals & Monitoring (8/12) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* THE SETTLEMENT QUEUE (NEW) */}
                        {pendingIntents.length > 0 && (
                            <section className="bg-white rounded-[3rem] shadow-2xl border-2 border-indigo-500/20 overflow-hidden animate-in fade-in-50 duration-500">
                                <div className="p-10 bg-indigo-900 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-2xl"><CreditCard className="w-6 h-6 text-indigo-400" /></div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight">Settlement Queue</h2>
                                            <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Verify Transfers & External Payments</p>
                                        </div>
                                    </div>
                                    <span className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">{pendingIntents.length} Pending</span>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pendingIntents.map(intent => (
                                        <div key={intent.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-4 hover:border-indigo-200 transition-all shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase mb-2 inline-block">{intent.payment_type}</span>
                                                    <h4 className="text-2xl font-black text-slate-800">₦{Number(intent.expected_amount).toLocaleString()}</h4>
                                                    <p className="text-xs text-slate-400 font-medium">{intent.order?.customer_name || 'Walk-in'} • {intent.order?.table_reference || 'Counter'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handlePaymentReject(intent.id)} className="p-2.5 text-rose-300 hover:text-rose-600 transition-colors"><XCircle className="w-6 h-6" /></button>
                                                    <button onClick={() => handlePaymentApprove(intent.id)} className="p-2.5 text-emerald-300 hover:text-emerald-600 transition-colors"><CheckCircle className="w-6 h-6" /></button>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <span>{new Date(intent.created_at).toLocaleTimeString()}</span>
                                                <span className="font-mono">{intent.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* SHIFT RECONCILIATION STATION */}
                        {pendingShifts.length > 0 && (
                            <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                                <div className="p-10 border-b border-slate-50 flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shift Reconciliation Station</h2>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Awaiting Manager Verification</p>
                                    </div>
                                </div>
                                <div className="p-10 space-y-10">
                                    {pendingShifts.map(shift => (
                                        <div key={shift.id} className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">{shift.status.replace(/_/g, ' ')}</p>
                                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        Staff Session: {shift.staff_id.slice(0, 8).toUpperCase()}
                                                    </h3>
                                                </div>
                                                {shift.status === SHIFT_STATUS.REQUESTED ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleShiftRejectOpen(shift.id)} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] border border-rose-100">Reject</button>
                                                        <button onClick={() => handleShiftOpen(shift.id)} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg">Approve Opening</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleShiftApprove(shift.id)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg">Verify & Close Shift</button>
                                                )}
                                            </div>

                                            {shift.status === SHIFT_STATUS.AWAITING_APPROVAL && (
                                                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                <th className="px-6 py-4">Method</th>
                                                                <th className="px-6 py-4 text-right">Expected</th>
                                                                <th className="px-6 py-4 text-right">Declared</th>
                                                                <th className="px-6 py-4 text-right">Variance</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            <ReconciliationRow label="Liquid Cash" expected={shift.expected_cash} declared={shift.declared_cash} />
                                                            <ReconciliationRow label="POS Terminal" expected={shift.expected_pos} declared={shift.declared_pos} />
                                                            <ReconciliationRow label="Bank Transfer" expected={shift.expected_transfer} declared={shift.declared_transfer} />
                                                            <tr className="bg-white/50">
                                                                <td className="px-6 py-5 font-black text-slate-900">Total Settlement</td>
                                                                <td className="px-6 py-5 text-right font-black">₦{Number(shift.expected_total || 0).toLocaleString()}</td>
                                                                <td className="px-6 py-5 text-right font-black text-indigo-600">₦{Number(shift.declared_total || 0).toLocaleString()}</td>
                                                                <td className={`px-6 py-5 text-right font-black ${(shift.variance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₦{Number(shift.variance || 0).toLocaleString()}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 3. PAYMENT INTEGRITY MONITOR (FEED) */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-10 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center text-slate-900">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-emerald-600" />
                                    <h2 className="text-xl font-bold tracking-tight">Settlement Integrity Feed</h2>
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">REALTIME SYNC</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-10 py-5">Time</th>
                                            <th className="px-10 py-5">Value</th>
                                            <th className="px-10 py-5">Method</th>
                                            <th className="px-10 py-5 text-right">Authority</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-10 py-6">
                                                    <p className="text-xs font-bold text-slate-800">{new Date(tx.created_at).toLocaleTimeString()}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">TX-{tx.id.slice(0, 8)}</p>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <p className="text-sm font-black text-slate-900">₦{Number(tx.amount).toLocaleString()}</p>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${tx.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                                                        tx.payment_type === 'pos' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                                                        }`}>
                                                        {tx.payment_type}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-emerald-500 font-black text-[10px] uppercase">
                                                        <ShieldCheck className="w-4 h-4" /> Verified
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && <tr><td colSpan={4} className="px-10 py-12 text-center text-slate-400 italic">No transactions recorded today.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Sidebar (4/12) */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="bg-slate-900 rounded-[3rem] shadow-2xl p-8 space-y-6">
                            <div className="flex items-center gap-3 text-amber-500">
                                <AlertTriangle className="w-6 h-6 border-2 border-amber-500 p-0.5 rounded-lg" />
                                <h3 className="font-black uppercase tracking-widest text-[10px]">Security Exception Center</h3>
                            </div>
                            <div className="space-y-3">
                                {alerts.map((alert, i) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4 animate-pulse">
                                        <div className={`p-2 rounded-lg ${alert.type === 'inventory' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs text-slate-300 font-medium leading-relaxed">{alert.message}</p>
                                    </div>
                                ))}
                                {alerts.length === 0 && <p className="text-center text-slate-500 text-[10px] py-4 uppercase font-black">Normal Service Operation</p>}
                            </div>
                        </section>

                        {/* 4. INVENTORY GUARDIAN */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-50 rounded-2xl"><Package className="w-5 h-5 text-indigo-600" /></div>
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Inventory Guardian</h3>
                                </div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full">LIVE</span>
                            </div>
                            <div className="space-y-2">
                                {inventory.slice(0, 8).map(item => (
                                    <InventoryRow key={item.id} item={item} />
                                ))}
                                {inventory.length === 0 && <p className="text-center py-8 text-slate-400 text-xs italic">No items in inventory.</p>}
                            </div>
                            <button className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors border-t border-slate-50 mt-4 flex items-center justify-center gap-2">
                                Audit Full Inventory <ChevronRight className="w-4 h-4" />
                            </button>
                        </section>

                        {/* 5. STAFF ACCOUNTABILITY PANEL */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-50 rounded-2xl"><Users className="w-5 h-5 text-rose-600" /></div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff Snapshot</h2>
                            </div>
                            <div className="space-y-4">
                                {activeShifts.map(shift => (
                                    <div key={shift.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-emerald-200 transition-all flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-300 border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all text-xs">
                                                {shift.staff_id.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">Staff-ID: {shift.staff_id.slice(0, 8)}</p>
                                                <p className="text-[9px] text-emerald-600 font-black uppercase">Active {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {activeShifts.length === 0 && <p className="text-center py-4 text-slate-400 text-[10px] font-black uppercase">Terminals Offline</p>}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ManagerCommandCenter;
