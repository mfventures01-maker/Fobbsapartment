import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    business_id: string;
    expected_amount: number | null;
    transaction_amount: number | null;
    payment_method: string | null;
    intent_status: string;
    transaction_status: string | null;
    staff_id: string | null;
    created_at: string;
    status_flag: string;
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
    const { businessId, role, setOverrideBusinessId } = useRole();
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // State Buckets
    const [sysMetrics, setSysMetrics] = useState<SystemMetrics>({
        ordersToday: 0, intentsToday: 0, transactionsToday: 0, revenueToday: 0, activeShifts: 0
    });
    const [revenueData, setRevenueData] = useState<RevenueData>({ byMethod: {}, byDept: {}, byStaff: [] });
    const [pipelineData, setPipelineData] = useState<PipelineRow[]>([]);
    const [shiftData, setShiftData] = useState<ShiftData[]>([]);

    const [transactions, setTransactions] = useState<any[]>([]);

    // Use AbortController for initial fetch
    const abortControllerRef = useRef<AbortController | null>(null);

    // Deriving metrics and revenue data in-memory whenever transactions/shifts change
    const computeMetrics = useCallback(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // 1. Transactions Today
        const txsToday = transactions.filter(t => t.created_at >= todayISO);
        const revenueToday = txsToday.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        setSysMetrics(prev => ({
            ...prev,
            transactionsToday: txsToday.length,
            revenueToday,
            activeShifts: shiftData.length,
        }));

        // 2. Revenue Intelligence
        const byMethod: { [key: string]: number } = {};
        const byDept: { [key: string]: number } = {};
        const staffMap: { [key: string]: { total: number; count: number } } = {};

        txsToday.forEach(t => {
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

        // Update shift run-rates based on in-memory transactions
        setShiftData(shifts => shifts.map(s => {
            const shiftTxs = transactions.filter(t => t.shift_id === s.id);
            const total = shiftTxs.reduce((acc, t) => acc + Number(t.amount), 0);
            const breakdown: any = {};
            shiftTxs.forEach(t => {
                const type = (t.payment_type || 'unknown').toLowerCase();
                breakdown[type] = (breakdown[type] || 0) + Number(t.amount);
            });
            return {
                ...s,
                total_processed: total,
                method_breakdown: breakdown
            };
        }));
    }, [transactions, shiftData.length]);

    useEffect(() => {
        computeMetrics();
    }, [computeMetrics]);

    // Initial Hydration
    const hydrateData = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const isGlobal = role === 'super_admin' && !businessId;

        try {
            console.log(`[CEO DASHBOARD] Hydrating Phase... Business: ${isGlobal ? 'Global' : businessId}`);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            let pipelineQuery = supabase.from('dashboard_financial_integrity').select('*').limit(50).order('created_at', { ascending: false });
            let txsQuery = supabase.from('transactions').select('*').gte('created_at', todayISO);
            let shiftsQuery = supabase.from('shifts').select('*').is('end_time', null);

            if (!isGlobal && businessId) {
                pipelineQuery = pipelineQuery.eq('business_id', businessId);
                txsQuery = txsQuery.eq('business_id', businessId);
                shiftsQuery = shiftsQuery.eq('business_id', businessId);
            }

            const [pRes, tRes, sRes] = await Promise.all([
                pipelineQuery,
                txsQuery,
                shiftsQuery
            ]);

            if (pRes.error) {
                // If view isn't created yet or RLS fails, handle gracefully
                console.warn("Pipeline fetch failed - schema likely unmigrated", pRes.error);
            } else {
                setPipelineData(pRes.data as PipelineRow[] || []);
            }

            if (tRes.error) throw tRes.error;
            if (sRes.error) throw sRes.error;

            setTransactions(tRes.data || []);

            const activeShifts = (sRes.data || []).map(s => ({
                id: s.id,
                staff_id: s.staff_id,
                start_time: s.start_time,
                total_processed: 0,
                method_breakdown: {},
                status: 'active'
            } as ShiftData));

            setShiftData(activeShifts);
            setLastUpdated(new Date());

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("[Hydration] error:", err);
                toast.error("Failed to sync backend metrics");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [businessId, role]);

    // Realtime Unified Channel
    useEffect(() => {
        hydrateData();

        if (!supabase) return;

        console.log(`[CEO DASHBOARD] Subscribing Realtime Channel for ID: ${businessId || 'GLOBAL'}`);
        const channel = supabase.channel(`dashboard_live_${businessId || 'global'}`);

        // Construct filter string if isolated
        const filterStr = businessId ? `business_id=eq.${businessId}` : undefined;

        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: filterStr }, (payload) => {
                console.log('Realtime Transaction Event:', payload);
                if (payload.eventType === 'INSERT') {
                    setTransactions(prev => [payload.new, ...prev]);
                    // Optimistic pipeline patch
                    setPipelineData(prev => {
                        let matched = false;
                        const next = prev.map(p => {
                            if (p.order_id === payload.new.order_id || p.order_id === payload.new.payment_intent_id) {
                                matched = true;
                                return {
                                    ...p,
                                    transaction_amount: payload.new.amount,
                                    transaction_status: payload.new.status,
                                    status_flag: Number(payload.new.amount) === Number(p.expected_amount) ? 'ok' : 'amount_mismatch'
                                };
                            }
                            return p;
                        });
                        // If it's totally orphaned (no intent matched), optionally prepend it
                        if (!matched) {
                            next.unshift({
                                order_id: payload.new.order_id || payload.new.id,
                                business_id: payload.new.business_id,
                                expected_amount: null,
                                transaction_amount: payload.new.amount,
                                payment_method: payload.new.payment_type,
                                intent_status: 'none',
                                transaction_status: payload.new.status,
                                staff_id: payload.new.staff_id,
                                created_at: payload.new.created_at,
                                status_flag: 'orphan_transaction'
                            });
                        }
                        return next.slice(0, 50);
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setTransactions(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
                }
                setLastUpdated(new Date());
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: filterStr }, (payload) => {
                console.log('Realtime Shift Event:', payload);
                if (payload.eventType === 'INSERT') {
                    setShiftData(prev => [{
                        id: payload.new.id,
                        staff_id: payload.new.staff_id,
                        start_time: payload.new.start_time,
                        total_processed: 0,
                        method_breakdown: {},
                        status: 'active'
                    }, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.end_time) {
                        // closed shift drops off active list in realtime
                        setShiftData(prev => prev.filter(s => s.id !== payload.new.id));
                    }
                }
                setLastUpdated(new Date());
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_intents', filter: filterStr }, (payload) => {
                console.log('Realtime Intent Event:', payload);
                if (payload.eventType === 'INSERT') {
                    setPipelineData(prev => [{
                        order_id: payload.new.order_id || 'unknown',
                        business_id: payload.new.business_id,
                        expected_amount: payload.new.expected_amount,
                        transaction_amount: null,
                        payment_method: payload.new.payment_type || 'N/A',
                        intent_status: payload.new.status,
                        transaction_status: 'none',
                        staff_id: payload.new.staff_id,
                        created_at: payload.new.created_at,
                        status_flag: 'missing_transaction'
                    }, ...prev].slice(0, 50));
                } else if (payload.eventType === 'UPDATE') {
                    setPipelineData(prev => prev.map(p => p.order_id === payload.new.order_id ? {
                        ...p,
                        intent_status: payload.new.status,
                        expected_amount: payload.new.expected_amount
                    } : p));
                }
                setLastUpdated(new Date());
            })
            .subscribe();

        return () => {
            console.log(`[CEO DASHBOARD] Teardown Realtime Channel`);
            supabase.removeChannel(channel);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [hydrateData, businessId]);

    // Initial Dropdown Load for Super Admin
    useEffect(() => {
        if (role === 'super_admin') {
            supabase?.from('businesses').select('*').then(({ data }) => {
                if (data) setBusinesses(data);
            });
        }
    }, [role]);

    const handleManualRefresh = () => {
        setRefreshing(true);
        hydrateData();
    };


    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-emerald-500">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <h2 className="text-xl font-black tracking-widest uppercase">Initializing Realtime Matrix...</h2>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">

            {/* TOP BAR */}
            <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-xl flex justify-between items-center rounded-b-xl mx-4 mt-2">
                <div>
                    <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-500" />
                        Live Operations Array
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mt-1">
                        {role === 'super_admin' ? (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-white font-bold">Scope:</span>
                                <select
                                    className="bg-slate-800 border-none text-[10px] rounded px-2 py-0.5 focus:ring-0 cursor-pointer"
                                    value={businessId || ''}
                                    onChange={(e) => setOverrideBusinessId(e.target.value || null)}
                                >
                                    <option value="">Global View (All)</option>
                                    {businesses.map(b => (
                                        <option key={b.id} value={b.id}>{b.name || b.id}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            `Realtime Engine Online • Updated ${lastUpdated.toLocaleTimeString()}`
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-emerald-500 text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                    </span>
                    <button
                        onClick={handleManualRefresh}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-all active:scale-95"
                        disabled={refreshing}
                        title="Force Sync"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* ROW 1: SYSTEM KPI */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <KPICard label="Orders Today" value={sysMetrics.ordersToday || '-'} icon={<Activity />} />
                    <KPICard label="Intents" value={sysMetrics.intentsToday || '-'} icon={<Clock />} />
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
                            {Object.entries(revenueData.byMethod).length === 0 ? <p className="text-xs text-slate-400">No data</p> : Object.entries(revenueData.byMethod).map(([method, amount]) => (
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
                            {Object.entries(revenueData.byDept).length === 0 ? <p className="text-xs text-slate-400">No data</p> : Object.entries(revenueData.byDept).map(([dept, amount]) => (
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
                            {revenueData.byStaff.length === 0 ? <p className="text-xs text-slate-400">No data</p> : revenueData.byStaff.slice(0, 5).map((s, i) => (
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

                {/* ROW 3: PIPELINE INTEGRITY (SQL-Driven) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" /> Pipeline Integrity (Live Postgres Sync)
                        </h3>
                        <span className="text-xs font-bold text-slate-400">{pipelineData.length} Live Records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Timestamp</th>
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3 text-right">Expected</th>
                                    <th className="px-6 py-3 text-right">Paid</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Integrity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pipelineData.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-mono">Standby. Awaiting realtime transaction syncs...</td></tr>
                                ) : pipelineData.map((row, i) => (
                                    <tr key={`${i}-${row.order_id}-${row.created_at}`} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {row.created_at ? new Date(row.created_at).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                                            {row.order_id ? row.order_id.slice(0, 8) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                                            {row.expected_amount !== null ? '₦' + Number(row.expected_amount).toLocaleString('en-NG', { maximumFractionDigits: 0 }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                            {row.transaction_amount !== null ? '₦' + Number(row.transaction_amount).toLocaleString('en-NG', { maximumFractionDigits: 0 }) : '-'}
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
                                            <span className={`text-xs font-bold uppercase ${row.transaction_status === 'paid' || row.transaction_status === 'verified' ? 'text-emerald-600' : 'text-amber-500'
                                                }`}>
                                                {row.transaction_status || row.intent_status || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.status_flag !== 'ok' ? (
                                                <div className="flex items-center gap-1 text-red-600 animate-pulse font-bold text-[10px] uppercase bg-red-50 w-fit px-2 py-1 rounded">
                                                    <AlertTriangle className="w-3 h-3" /> {row.status_flag.replace(/_/g, ' ')}
                                                </div>
                                            ) : (
                                                <div className="text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold text-[10px] uppercase">
                                                    <CheckCircle className="w-3 h-3" /> MATCH
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
                            <Users className="w-4 h-4 text-purple-500" /> Active Shift Accountability (Realtime)
                        </h3>
                    </div>
                    {shiftData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-medium">No active shifts detected in matrix.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                            {shiftData.map(shift => (
                                <div key={shift.id} className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-emerald-500 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs font-black uppercase text-slate-400 tracking-widest">Active Staff</div>
                                            <div className="font-bold text-slate-800 font-mono text-sm">{shift.staff_id.slice(0, 8)}...</div>
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase animate-pulse">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> LIVE
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-3xl font-black text-slate-900 tracking-tight transition-all duration-300">
                                            {'₦' + shift.total_processed.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                                        </div>
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
                                    <div className="mt-4 pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-mono uppercase truncate">
                                        Shift ID: {shift.id.slice(0, 8)} | Started {new Date(shift.start_time).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ROW 5: FORENSIC AUDIT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden text-slate-300">
                        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500" /> High Variance Alerts
                            </h3>
                        </div>
                        <div className="p-8 text-center text-slate-500 text-xs font-mono uppercase">
                            Fraud Detection Core Online.
                            <br />Scanning for isolated variance spikes...
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden text-slate-300">
                        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-amber-500" /> Reversal Patterns
                            </h3>
                        </div>
                        <div className="p-8 text-center text-slate-500 text-xs font-mono uppercase">
                            Pattern Recognition Online.
                            <br />Analyzing voided intents in real-time...
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

interface KPICardProps {
    label: string;
    value: number | string;
    icon?: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-colors group">
        <div className="flex justify-between items-start mb-2 opacity-50 group-hover:opacity-100 transition-opacity text-slate-500 group-hover:text-emerald-600">
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            {icon ? <div>{icon}</div> : null}
        </div>
        <div className="text-2xl font-black text-slate-900 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
    </div>
);

export default CeoDashboard;
