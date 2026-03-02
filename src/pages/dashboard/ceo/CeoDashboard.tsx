import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import {
    Loader2, RefreshCw, Activity, AlertTriangle,
    CheckCircle, Clock, DollarSign, Users,
    Database, BarChart3, ShieldCheck, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- TYPES ---
interface SystemMetrics {
    transactionsToday: number;
    revenueToday: number;
    activeShifts: number;
    pendingApprovals: number;
}

interface ShiftReport {
    id: string;
    staff_id: string;
    staff_name?: string;
    department_id: string;
    start_time: string;
    ends_at?: string;
    status: string;
    expected_revenue: number;
    declared_total: number;
    variance: number;
}

const CeoDashboard: React.FC = () => {
    const { authority } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [metrics, setMetrics] = useState<SystemMetrics>({
        transactionsToday: 0,
        revenueToday: 0,
        activeShifts: 0,
        pendingApprovals: 0
    });
    const [shifts, setShifts] = useState<ShiftReport[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<any[]>([]);

    const hydrate = useCallback(async () => {
        if (authority.status !== 'authorized') return;
        setRefreshing(true);

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // 1. Fetch Today's Transactions
            const { data: txs } = await supabase
                .from('transactions')
                .select('amount, staff_id')
                .eq('business_id', authority.businessId)
                .gte('created_at', todayISO);

            // 2. Fetch Shift Reports (Recent 50)
            const { data: shiftData } = await supabase
                .from('shifts')
                .select('*')
                .eq('business_id', authority.businessId)
                .order('start_time', { ascending: false })
                .limit(50);

            if (shiftData) {
                setShifts(shiftData as ShiftReport[]);
            }

            // 3. Calculate Metrics
            const rev = (txs || []).reduce((acc, t) => acc + Number(t.amount), 0);
            const pending = (shiftData || []).filter(s => s.status === 'awaiting_manager_approval').length;
            const active = (shiftData || []).filter(s => s.status === 'open').length;

            setMetrics({
                transactionsToday: txs?.length || 0,
                revenueToday: rev,
                activeShifts: active,
                pendingApprovals: pending
            });

            // 4. Staff Performance Mapping
            const performanceMap: any = {};
            (txs || []).forEach(t => {
                if (!performanceMap[t.staff_id]) performanceMap[t.staff_id] = 0;
                performanceMap[t.staff_id] += Number(t.amount);
            });
            setStaffPerformance(Object.entries(performanceMap).map(([id, total]) => ({ id, total })));

        } catch (err) {
            console.error('[CEO] Hydrate Error:', err);
            toast.error('Failed to update dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authority]);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-emerald-500">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <h2 className="text-xl font-black tracking-widest uppercase">Syncing CEO Oversight...</h2>
        </div>
    );

    return (
        <div className="min-h-[90vh] space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-emerald-600" />
                        CARSS CEO Oversight
                    </h1>
                    <p className="text-slate-500 font-medium">Deterministic revenue and shift integrity tracking.</p>
                </div>
                <button
                    onClick={hydrate}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-emerald-900 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Matrix
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard label="Revenue Today" value={`₦${metrics.revenueToday.toLocaleString()}`} icon={<DollarSign className="text-emerald-600" />} color="emerald" />
                <KPICard label="Daily Transactions" value={metrics.transactionsToday} icon={<Activity className="text-blue-600" />} color="blue" />
                <KPICard label="Active Shifts" value={metrics.activeShifts} icon={<Users className="text-purple-600" />} color="purple" />
                <KPICard label="Pending Approvals" value={metrics.pendingApprovals} icon={<Clock className="text-amber-600" />} color="amber" />
            </div>

            {/* Shift Integrity Heatmap / List */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-emerald-600" />
                            Shift Integrity Matrix
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">Real-time variance detection per shift.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100/50 text-[10px] uppercase tracking-widest font-black text-slate-400">
                                <th className="px-8 py-4">Shift ID</th>
                                <th className="px-8 py-4">Staff</th>
                                <th className="px-8 py-4">Department</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4 text-right">Expected</th>
                                <th className="px-8 py-4 text-right">Declared</th>
                                <th className="px-8 py-4 text-right">Variance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {shifts.map(shift => (
                                <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400 font-bold">
                                        {shift.id.slice(0, 8)}...
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-[10px]">
                                                {shift.staff_id.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate w-24">{shift.staff_id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-500 uppercase">{shift.department_id}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <StatusBadge status={shift.status} />
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono font-bold text-slate-600 text-sm">
                                        ₦{Number(shift.expected_revenue || 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono font-black text-slate-900 text-sm">
                                        ₦{Number(shift.declared_total || 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <VarianceBadge value={shift.variance || 0} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                {/* Staff Performance */}
                <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Today's Staff Performance
                    </h3>
                    <div className="space-y-4">
                        {staffPerformance.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-slate-400">{staff.id.slice(0, 8)}</span>
                                </div>
                                <span className="font-black text-slate-900">₦{staff.total.toLocaleString()}</span>
                            </div>
                        ))}
                        {staffPerformance.length === 0 && <p className="text-center text-slate-400 text-sm py-8 font-medium italic">No performance data yet today.</p>}
                    </div>
                </div>

                {/* System Alerts */}
                <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-800 text-white">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        Forensic Integrity Alerts
                    </h3>
                    <div className="space-y-4">
                        {shifts.filter(s => Math.abs(s.variance) > 1000).map(s => (
                            <div key={s.id} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <div>
                                        <p className="text-xs font-bold text-red-200 uppercase tracking-wider">High Variance Detected</p>
                                        <p className="text-[10px] text-red-500/80 font-mono">Shift: {s.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-red-500">₦{s.variance.toLocaleString()}</span>
                            </div>
                        ))}
                        {shifts.filter(s => Math.abs(s.variance) > 1000).length === 0 && (
                            <div className="text-center py-12 opacity-30 select-none">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.2em]">Zero Critical Variance Alerts</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, color }: any) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 hover:scale-[1.02] transition-all cursor-default group`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl bg-${color}-50 group-hover:bg-${color}-100 transition-colors`}>
                {icon}
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
        open: 'bg-emerald-100 text-emerald-700',
        pending_declaration: 'bg-amber-100 text-amber-700',
        awaiting_manager_approval: 'bg-blue-100 text-blue-700',
        closed: 'bg-slate-100 text-slate-600',
        rejected: 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${config[status] || 'bg-gray-100 text-gray-600'}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
};

const VarianceBadge = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-emerald-500 font-bold text-xs flex items-center gap-1 justify-end"><CheckCircle className="w-3 h-3" /> Balanced</span>;
    if (value > 0) return <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 justify-end"><ArrowUpRight className="w-3 h-3" /> +₦{value.toLocaleString()}</span>;
    return <span className="text-red-600 font-bold text-xs flex items-center gap-1 justify-end"><ArrowDownRight className="w-3 h-3" /> -₦{Math.abs(value).toLocaleString()}</span>;
};

export default CeoDashboard;
