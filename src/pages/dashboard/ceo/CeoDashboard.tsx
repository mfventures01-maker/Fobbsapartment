import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle, Clock, DollarSign, Users, Database } from 'lucide-react';
import toast from 'react-hot-toast';

// --- TYPES ---
interface SystemMetrics {
    ordersToday: number;
    intentsToday: number;
    transactionsToday: number;
    revenueToday: number;
    activeShifts: number;
}

interface RevenueData {
    byMethod: { [key: string]: number };
    byDept: { [key: string]: number };
    byStaff: { id: string; total: number; count: number }[];
}

interface PipelineRow {
    order_id: string;
    order_total: number;
    expected_amount: number | null;
    transaction_amount: number | null;
    payment_status: string;
    payment_method: string | null;
    staff_id: string | null;
    created_at: string;
    mismatch: boolean;
}

interface ShiftData {
    id: string;
    staff_id: string;
    start_time: string;
    total_processed: number;
    method_breakdown: { [key: string]: number };
    status: 'active' | 'closed';
}

const CeoDashboard: React.FC = () => {
    const { businessId, role } = useRole();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // State Buckets
    const [sysMetrics, setSysMetrics] = useState<SystemMetrics>({
        ordersToday: 0, intentsToday: 0, transactionsToday: 0, revenueToday: 0, activeShifts: 0
    });
    const [revenueData, setRevenueData] = useState<RevenueData>({ byMethod: {}, byDept: {}, byStaff: [] });
    const [pipelineData, setPipelineData] = useState<PipelineRow[]>([]);
    const [shiftData, setShiftData] = useState<ShiftData[]>([]);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!businessId || !supabase) return;
        if (isRefresh) setRefreshing(true);

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            console.log(`[CEO DASHBOARD] Fetching data for Business: ${businessId} since ${todayISO}`);

            // 1. Parallel Data Fetching
            const [ordersRes, intentsRes, txsRes, shiftsRes] = await Promise.all([
                supabase.from('orders').select('*').eq('org_id', businessId).gte('created_at', todayISO),
                supabase.from('payment_intents').select('*').eq('business_id', businessId).gte('created_at', todayISO),
                supabase.from('transactions').select('*').eq('business_id', businessId).gte('created_at', todayISO),
                supabase.from('shifts').select('*').eq('org_id', businessId).is('ends_at', null) // Active shifts
            ]);

            if (ordersRes.error) throw ordersRes.error;
            if (intentsRes.error) throw intentsRes.error;
            if (txsRes.error) throw txsRes.error;
            if (shiftsRes.error) throw shiftsRes.error;

            const orders = ordersRes.data || [];
            const intents = intentsRes.data || [];
            const transactions = txsRes.data || [];
            const shifts = shiftsRes.data || [];

            // --- PROCESS 1: SYSTEM OVERVIEW ---
            const revenueToday = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
            setSysMetrics({
                ordersToday: orders.length,
                intentsToday: intents.length,
                transactionsToday: transactions.length,
                revenueToday,
                activeShifts: shifts.length
            });

            // --- PROCESS 2: REVENUE INTELLIGENCE ---
            const byMethod: { [key: string]: number } = {};
            const byDept: { [key: string]: number } = {};
            const staffMap: { [key: string]: { total: number; count: number } } = {};

            transactions.forEach(t => {
                const amt = Number(t.amount);
                // Method
                const method = (t.payment_type || 'unknown').toLowerCase();
                byMethod[method] = (byMethod[method] || 0) + amt;
                // Dept
                const dept = t.department_id || 'unassigned';
                byDept[dept] = (byDept[dept] || 0) + amt;
                // Staff
                const staff = t.staff_id || 'unknown';
                if (!staffMap[staff]) staffMap[staff] = { total: 0, count: 0 };
                staffMap[staff].total += amt;
                staffMap[staff].count += 1;
            });

            const byStaff = Object.entries(staffMap)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.total - a.total);

            setRevenueData({ byMethod, byDept, byStaff });

            // --- PROCESS 3: PIPELINE INTEGRITY ---
            // Map orders to intents and transactions to find mismatches
            const pipeline: PipelineRow[] = orders.map(order => {
                const intent = intents.find(i => i.order_id === order.id);
                const tx = transactions.find(t => t.order_id === order.id); // Assuming transaction has order_id link

                const orderTotal = Number(order.total);
                const expected = intent ? Number(intent.expected_amount) : null;
                const actual = tx ? Number(tx.amount) : null;

                // Mismatch Logic: 
                // 1. Transaction exists but amount differs from Order
                // 2. Intent exists but differs from Order
                const isMismatch = (actual !== null && Math.abs(actual - orderTotal) > 10) ||
                    (expected !== null && Math.abs(expected - orderTotal) > 10);

                return {
                    order_id: order.id,
                    order_total: orderTotal,
                    expected_amount: expected,
                    transaction_amount: actual,
                    payment_status: tx ? 'paid' : (intent ? 'pending' : 'open'),
                    payment_method: tx?.payment_type || intent?.payment_type || null,
                    staff_id: tx?.staff_id || intent?.staff_id || order.created_by,
                    created_at: order.created_at,
                    mismatch: isMismatch
                };
            }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Add orphan transactions (Transactions without orders in list)
            transactions.filter(t => !orders.find(o => o.id === t.order_id)).forEach(t => {
                pipeline.push({
                    order_id: t.order_id || 'NO_ORDER',
                    order_total: 0,
                    expected_amount: null,
                    transaction_amount: Number(t.amount),
                    payment_status: 'orphan_transaction',
                    payment_method: t.payment_type,
                    staff_id: t.staff_id,
                    created_at: t.created_at,
                    mismatch: true
                });
            });

            setPipelineData(pipeline.slice(0, 50)); // Show top 50 recent

            // --- PROCESS 4: SHIFT ACCOUNTABILITY ---
            // For active shifts, calculate current run-rate
            const activeShiftsData = await Promise.all(shifts.map(async (s) => {
                // Fetch stats for this shift
                // Ideally we filter transactions by shift_id if available, or by time window + staff_id
                // Here we try strict shift_id linkage if column exists, else time/staff fallback
                const { data: shiftTxs } = await supabase
                    .from('transactions')
                    .select('amount, payment_type')
                    .eq('business_id', businessId)
                    .eq('staff_id', s.staff_user_id) // simplified linkage
                    .gte('created_at', s.starts_at);

                const total = shiftTxs?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;
                const breakdown: any = {};
                shiftTxs?.forEach(t => {
                    const type = t.payment_type || 'unknown';
                    breakdown[type] = (breakdown[type] || 0) + Number(t.amount);
                });

                return {
                    id: s.id,
                    staff_id: s.staff_user_id,
                    start_time: s.starts_at,
                    total_processed: total,
                    method_breakdown: breakdown,
                    status: 'active'
                } as ShiftData;
            }));

            setShiftData(activeShiftsData);
            setLastUpdated(new Date());

        } catch (err: any) {
            console.error(err);
            toast.error("Failed to sync backend metrics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [businessId]);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Demo Mode Loop
    useEffect(() => {
        if (!demoMode) return;
        const interval = setInterval(() => {
            fetchData(true);
        }, 15000);
        return () => clearInterval(interval);
    }, [demoMode, fetchData]);


    const formatCurrency = (val: number) => {
        if (value === null || value === undefined) return '-';
        return '₦' + val.toLocaleString('en-NG', { maximumFractionDigits: 0 });
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-emerald-500">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <h2 className="text-xl font-black tracking-widest uppercase">Initializing Command Center...</h2>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">

            {/* TOP BAR - Reduced since Layout handles main Nav */}
            <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-xl flex justify-between items-center rounded-b-xl mx-4 mt-2">
                <div>
                    <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-500" />
                        Backend Operations
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mt-1">
                        {role === 'super_admin' ? 'Super Admin Mode' : 'Executive Control'} • {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-400">Demo Mode</span>
                        <button
                            onClick={() => setDemoMode(!demoMode)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${demoMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${demoMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-all active:scale-95"
                        disabled={refreshing}
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* ROW 1: SYSTEM KPI */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <KPICard label="Orders Today" value={sysMetrics.ordersToday} icon={<Activity />} />
                    <KPICard label="Intents" value={sysMetrics.intentsToday} icon={<Clock />} />
                    <KPICard label="Transactions" value={sysMetrics.transactionsToday} icon={<CheckCircle />} />
                    <KPICard label="Active Shifts" value={sysMetrics.activeShifts} icon={<Users />} />
                    <div className="col-span-2 md:col-span-1 bg-emerald-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Today's Revenue</h3>
                            <div className="text-3xl font-black tracking-tighter">{'₦' + sysMetrics.revenueToday.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <DollarSign className="absolute right-4 bottom-4 text-emerald-800 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
                    </div>
                </div>

                {/* ROW 2: REVENUE INTELLIGENCE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Payment Breakdown */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Payment Methods</h3>
                        <div className="space-y-4">
                            {Object.entries(revenueData.byMethod).map(([method, amount]) => (
                                <div key={method} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 capitalize font-bold text-slate-700">
                                        <div className={`w-3 h-3 rounded-full ${method === 'cash' ? 'bg-amber-500' : method === 'pos' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                        {method}
                                    </div>
                                    <span className="font-mono font-bold text-slate-900">{'₦' + amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Department Breakdown */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Department Revenue</h3>
                        <div className="space-y-4">
                            {Object.entries(revenueData.byDept).map(([dept, amount]) => (
                                <div key={dept} className="flex justify-between items-center">
                                    <span className="capitalize font-bold text-slate-700 text-sm">{dept.replace(/_/g, ' ')}</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{'₦' + amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Staff */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Top Generators</h3>
                        <div className="space-y-3">
                            {revenueData.byStaff.slice(0, 5).map((s, i) => (
                                <div key={s.id} className="flex justify-between items-center text-sm border-b border-dashed border-slate-100 pb-2 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-xs">#{i + 1}</span>
                                        <span className="font-bold text-slate-700 truncate w-24">{s.id.split('-')[0]}...</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-emerald-600">{'₦' + s.total.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-[10px] text-slate-400">{s.count} txs</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ROW 3: PIPELINE INTEGRITY */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" /> Pipeline Integrity
                        </h3>
                        <span className="text-xs font-bold text-slate-400">{pipelineData.length} Live Records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Timestamp</th>
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3 text-right">Order Total</th>
                                    <th className="px-6 py-3 text-right">Paid</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Integrity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pipelineData.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No recent pipeline activity</td></tr>
                                ) : pipelineData.map((row) => (
                                    <tr key={row.order_id + row.created_at} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {new Date(row.created_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                                            {row.order_id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                                            {'₦' + row.order_total.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                            {row.transaction_amount !== null ? '₦' + row.transaction_amount.toLocaleString('en-NG', { maximumFractionDigits: 0 }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 capitalize text-xs font-bold">
                                            <span className={`px-2 py-1 rounded-full ${row.payment_method === 'cash' ? 'bg-amber-100 text-amber-700' :
                                                row.payment_method === 'pos' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {row.payment_method || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold uppercase ${row.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-500'
                                                }`}>
                                                {row.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.mismatch ? (
                                                <div className="flex items-center gap-1 text-red-600 animate-pulse font-bold text-xs uppercase">
                                                    <AlertTriangle className="w-4 h-4" /> Mismatch
                                                </div>
                                            ) : (
                                                <div className="text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ROW 4: ACTIVE SHIFTS */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" /> Active Shift Accountability
                        </h3>
                    </div>
                    {shiftData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-medium">No active shifts detected.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                            {shiftData.map(shift => (
                                <div key={shift.id} className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs font-black uppercase text-slate-400 tracking-widest">Active Staff</div>
                                            <div className="font-bold text-slate-800 font-mono text-sm">{shift.staff_id.slice(0, 8)}...</div>
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold uppercase">Active</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-3xl font-black text-slate-900 tracking-tight">{'₦' + shift.total_processed.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-xs text-slate-500 font-medium mt-1">Processed this shift</div>
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(shift.method_breakdown).map(([method, amt]) => (
                                            <div key={method} className="flex justify-between text-xs">
                                                <span className="capitalize text-slate-500 font-medium">{method}</span>
                                                <span className="font-mono font-bold text-slate-700">{'₦' + amt.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-mono uppercase">
                                        Started {new Date(shift.start_time).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const KPICard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2 opacity-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            {icon}
        </div>
        <div className="text-2xl font-black text-slate-900">{value.toLocaleString()}</div>
    </div>
);

export default CeoDashboard;
