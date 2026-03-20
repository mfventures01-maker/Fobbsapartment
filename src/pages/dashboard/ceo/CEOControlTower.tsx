import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { callRPC } from '@/lib/rpcClient';
import { useAuth } from '@/contexts/AuthContext';
import {
    Activity, ShieldCheck, Zap, Target, ShieldAlert,
    Clock, RefreshCw, AlertTriangle,
    TrendingUp, Landmark,
    Plus, Lock, Users,
    MapPin, Building2, Layers, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { safeNumber } from '@/lib/safeNumber';
import { useSystemState } from '@/hooks/useSystemState';

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-4 rounded-2xl ${color.bg} ${color.text} shadow-inner`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{value}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 font-bold">{subtitle}</p>}
    </div>
);

const BranchRow = ({ branch }: { branch: any }) => (
    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-emerald-200 transition-all group">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:text-emerald-500 transition-colors">
                <MapPin className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-black text-slate-800">{branch.name}</p>
                <div className="flex gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span>{branch.staff_count || 0} Staff</span>
                    <span>•</span>
                    <span>{branch.order_count || 0} Orders</span>
                </div>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm font-black text-slate-900">₦{safeNumber(branch.revenue)}</p>
            <p className="text-[9px] font-black text-emerald-500 uppercase">Live Performance</p>
        </div>
    </div>
);

const CEOControlTower: React.FC = () => {
    const { authority } = useAuth();
    const {
        revenue,
        orders,
        payments,
        open_shifts,
        recent_transactions,
        branch_performance,
        ceo_snapshot,
        refresh: systemRefresh
    } = useSystemState();

    // --- STATE (Governance Only) ---
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeBranches: 0,
        activeStaff: 0,
        totalDepartments: 0,
    });

    const [staffList, setStaffList] = useState<any[]>([]);
    const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);

    // --- GOVERNANCE HYDRATION ---
    const hydrate = useCallback(async () => {
        if (!authority.businessId) return;
        try {
            // ✅ Step 1: Purify CEO Terminal (Zero Drift Protocol)
            await systemRefresh(authority.businessId, authority.branchId || '');
        } catch (err: any) {
            console.error('[CEO TOWER] Re-sync failed:', err.message);
        }
    }, [authority.businessId, authority.branchId, systemRefresh]);

    useEffect(() => {
        hydrate();
        const heartbeat = setInterval(hydrate, 10000); // 10s CEO pulse
        return () => clearInterval(heartbeat);
    }, [hydrate]);

    // Update local states when ceo_snapshot from useSystemState changes
    useEffect(() => {
        if (ceo_snapshot) {
            setStats({
                activeBranches: ceo_snapshot.branch_count || 0,
                activeStaff: ceo_snapshot.staff_count || 0,
                totalDepartments: ceo_snapshot.dept_count || 0,
            });
            setStaffList(ceo_snapshot.top_staff || []);
            setInventoryAlerts(ceo_snapshot.critical_inventory || []);
            setRiskAlerts(ceo_snapshot.system_alerts || []);
        }
    }, [ceo_snapshot]);

    // --- CEO CONTROLS ---
    const handleDisableStaff = async (userId: string) => {
        if (!window.confirm('CRITICAL: Disable this staff account across the entire organization?')) return;
        const opLoading = toast.loading('Revoking Authority...');
        try {
            await callRPC('ceo', 'disable_staff', {
                p_user_id: userId,
                _idempotency_key: crypto.randomUUID()
            });
            toast.success('Staff Access Terminated', { id: opLoading });
            hydrate();
            systemRefresh(authority.businessId || '', '');
        } catch (err: any) {
            toast.error(err.message, { id: opLoading });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 space-y-8">

            {/* 1. GLOBAL COMMAND BAR */}
            <header className="bg-white border-b border-slate-100 p-6 sticky top-0 z-50 shadow-sm backdrop-blur-2xl bg-white/80">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-900 rounded-[1.75rem] shadow-2xl shadow-slate-900/20">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">CEO Control Tower</h1>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> High Authority Active</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Global Telemetry Live
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-6 px-8 py-3 rounded-[1.75rem] bg-slate-900 text-white shadow-xl shadow-slate-900/10 border border-white/5">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Branches</p>
                                <p className="text-xs font-black text-emerald-400">{stats.activeBranches}</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Staff</p>
                                <p className="text-xs font-black text-white">{stats.activeStaff}</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Open Shifts</p>
                                <p className="text-xs font-black text-amber-400">{open_shifts ?? 0}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="bg-emerald-600 text-white p-3.5 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button onClick={hydrate} className="p-3.5 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all bg-white shadow-sm">
                                <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 space-y-10">

                {/* 2. FINANCIAL INTELLIGENCE PANEL */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Revenue Today"
                        value={`₦${safeNumber(revenue?.today)}`}
                        icon={Landmark}
                        color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
                        trend="+18.2%"
                        subtitle="Across all branches"
                    />
                    <StatCard
                        title="Revenue: Last Hour"
                        value={`₦${safeNumber(revenue?.last_hour)}`}
                        icon={Zap}
                        color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
                        subtitle="Real-time intake velocity"
                    />
                    <StatCard
                        title="Pending Verification"
                        value={payments?.pending_intents ?? 0}
                        icon={Clock}
                        color={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
                        subtitle="Unresolved payment intents"
                    />
                    <StatCard
                        title="Target Performance"
                        value="94%"
                        icon={Target}
                        color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
                        trend="+2.1%"
                        subtitle="Operational efficiency"
                    />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: Branch Performance & Radar (8/12) */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* 3. BRANCH PERFORMANCE GRID */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-900 rounded-2xl"><Layers className="w-5 h-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Branch Performance Matrix</h2>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Multi-unit operational data</p>
                                    </div>
                                </div>
                                <button className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">Expand Branch Analytics</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {branch_performance.map(branch => (
                                    <BranchRow key={branch.id} branch={branch} />
                                ))}
                            </div>
                        </section>

                        {/* 4. LIVE OPERATIONS RADAR (TRANSACTION STREAM) */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-2xl"><Activity className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operational Radar Feed</h2>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Activity across Org</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">Orders: {orders?.open_orders ?? 0}</span>
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase">Shifts: {open_shifts ?? 0}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-10 py-5">Time</th>
                                            <th className="px-10 py-5">Branch</th>
                                            <th className="px-10 py-5 text-right">Method</th>
                                            <th className="px-10 py-5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                        {recent_transactions.slice(0, 6).map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-10 py-6">
                                                    <p className="text-xs font-bold text-slate-800">{new Date(tx.created_at).toLocaleTimeString()}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ID: {tx.id.slice(0, 8)}</p>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 text-slate-300" />
                                                        <span className="text-sm font-bold text-slate-700">{tx.branch_name || 'Main'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tx.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                                        }`}>{tx.payment_type}</span>
                                                </td>
                                                <td className="px-10 py-6 text-right font-black text-slate-900 text-sm">
                                                    ₦{safeNumber(tx.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: Governance & Risk (4/12) */}
                    <div className="lg:col-span-4 space-y-10">

                        {/* 6. RISK & EXCEPTION MONITOR */}
                        <section className="bg-slate-900 rounded-[3rem] shadow-2xl p-10 space-y-8 border border-white/5">
                            <div className="flex items-center gap-4 text-emerald-400">
                                <ShieldAlert className="w-6 h-6" />
                                <h3 className="text-lg font-black uppercase tracking-widest">Integrity Radar</h3>
                            </div>
                            <div className="space-y-4">
                                {riskAlerts.map((alert, i) => (
                                    <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${alert.type === 'variance' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <p className="text-[11px] text-slate-300 font-bold leading-relaxed">{alert.message}</p>
                                    </div>
                                ))}
                                {riskAlerts.length === 0 && <p className="text-center py-6 text-slate-600 text-[10px] font-black uppercase">Monitoring Security Channels...</p>}
                            </div>

                            <div className="pt-8 border-t border-white/5 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Health Alerts</h4>
                                {inventoryAlerts.map((inv, i) => (
                                    <div key={i} className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-200 font-bold">{inv.name} ({inv.branch?.name})</span>
                                        <span className="text-rose-500 font-black">{inv.current_stock} Left</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 5. STAFF GOVERNANCE CONSOLE */}
                        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl"><Users className="w-5 h-5 text-emerald-600" /></div>
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff Governance</h2>
                                </div>
                                <ShieldCheck className="w-5 h-5 text-slate-200" />
                            </div>
                            <div className="space-y-4">
                                {staffList.map(staff => (
                                    <div key={staff.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                                                {staff.profiles?.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{staff.profiles?.full_name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{staff.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDisableStaff(staff.user_id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                            title="Revoke Access"
                                        >
                                            <Lock className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-2 hover:text-emerald-600 transition-all">
                                    Manage Directory Assets <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default CEOControlTower;
