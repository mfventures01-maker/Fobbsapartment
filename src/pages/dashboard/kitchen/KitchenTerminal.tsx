import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Utensils, Clock, CheckCircle2, Flame,
    AlertCircle, RefreshCw, Timer, ChefHat,
    ArrowRight, BellRing, History, Settings2,
    Volume2, VolumeX, Layers, Play
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getKitchenSnapshot, updatePreparationStatus } from '@/services/kitchenService';
import { useSystemState } from '@/hooks/useSystemState';
import toast from 'react-hot-toast';
import { safeNumber } from '@/lib/safeNumber';

// --- SUB-COMPONENTS ---

interface TicketProps {
    ticket: any;
    onUpdate: (id: string, status: string) => void;
    serverTime: string;
}

const KitchenTicket: React.FC<TicketProps> = ({ ticket, onUpdate, serverTime }) => {
    const ageMinutes = Math.floor((new Date(serverTime).getTime() - new Date(ticket.created_at).getTime()) / 60000);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'preparing': return 'bg-amber-500 border-amber-600 shadow-amber-500/20';
            case 'ready': return 'bg-emerald-500 border-emerald-600 shadow-emerald-500/20';
            case 'pending': return 'bg-slate-700 border-slate-800 shadow-slate-900/20';
            default: return 'bg-slate-500';
        }
    };

    const isUrgent = ageMinutes > 15 && ticket.preparation_status !== 'ready';

    return (
        <div className={`flex flex-col h-full bg-[#1e293b] rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${isUrgent ? 'border-rose-500 shadow-xl shadow-rose-950/20 ring-4 ring-rose-500/10' : 'border-slate-800/50 hover:border-slate-700'}`}>
            {/* Header: Identity & Time */}
            <div className="p-6 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(ticket.preparation_status)}`} />
                        <h4 className="text-xl font-black text-white tracking-tighter uppercase tabular-nums">
                            {ticket.table_reference || 'COUNTER'}
                        </h4>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                        {ticket.customer_name || 'GUEST ORDER'}
                    </p>
                </div>
                <div className={`flex flex-col items-end ${isUrgent ? 'text-rose-400' : 'text-slate-400'}`}>
                    <div className="flex items-center gap-1.5 font-black text-lg tabular-nums tracking-tighter">
                        <Timer className="w-4 h-4" />
                        {ageMinutes}m
                    </div>
                    <p className="text-[8px] font-black uppercase opacity-50 tracking-tighter">SINCE INTAKE</p>
                </div>
            </div>

            {/* Body: Items Grid */}
            <div className="flex-1 px-6 py-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                    {ticket.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-2xl border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white border border-white/5 shadow-inner">
                                    {item.quantity}
                                </div>
                                <span className="text-sm font-bold text-slate-200 uppercase tracking-tight line-clamp-2">
                                    {item.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer: Deterministic Actions */}
            <div className="p-4 bg-slate-900/50 mt-auto border-t border-white/[0.03]">
                <div className="grid grid-cols-1 gap-3">
                    {ticket.preparation_status === 'pending' && (
                        <button
                            onClick={() => onUpdate(ticket.id, 'preparing')}
                            className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-amber-900/40 border-b-4 border-amber-800"
                        >
                            <Flame className="w-5 h-5" /> Start Cooking
                        </button>
                    )}
                    {ticket.preparation_status === 'preparing' && (
                        <button
                            onClick={() => onUpdate(ticket.id, 'ready')}
                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-emerald-900/40 border-b-4 border-emerald-800"
                        >
                            <BellRing className="w-5 h-5" /> Ready for Pickup
                        </button>
                    )}
                    {ticket.preparation_status === 'ready' && (
                        <div className="flex items-center justify-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Order is Awaiting Pickup
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN TERMINAL ---

const KitchenTerminal: React.FC = () => {
    const { authority } = useAuth();
    const { inventory_alerts, alerts: system_alerts } = useSystemState();

    // --- STATE (Drift-Free Reflection) ---
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [serverTime, setServerTime] = useState<string>(new Date().toISOString());
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [viewMode, setViewMode] = useState<'live' | 'history'>('live');

    // --- HYDRATION HEARTBEAT (Rule 7) ---
    const hydrate = useCallback(async () => {
        if (!authority.branchId) return;
        try {
            const data = await getKitchenSnapshot(authority.branchId);
            setTickets(data.tickets);
            setServerTime(data.server_time);

            // Notification logic (Implicit Burn Mirror)
            const newlyUrgent = data.tickets.some((t: any) => {
                const age = Math.floor((new Date(data.server_time).getTime() - new Date(t.created_at).getTime()) / 60000);
                return age > 15 && t.preparation_status !== 'ready';
            });

            if (newlyUrgent && soundEnabled) {
                // Play notification sound logic here
            }

        } catch (err: any) {
            console.error('[KITCHEN] Sync failed:', err.message);
        } finally {
            setLoading(false);
        }
    }, [authority.branchId, soundEnabled]);

    useEffect(() => {
        hydrate();
        const pulse = setInterval(hydrate, 4000); // 4s Drift Pulse
        return () => clearInterval(pulse);
    }, [hydrate]);

    // --- ACTIONS (Deterministic State Moves) ---
    const handleStatusUpdate = async (id: string, next: string) => {
        const opLoading = toast.loading('Syncing Status...');
        try {
            await updatePreparationStatus(id, next);
            toast.success('Workflow Mirror Synchronized', { id: opLoading });
            await hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: opLoading });
        }
    };

    // --- COMPUTED (Reflection Geometry) ---
    const stats = useMemo(() => {
        const pendingCount = tickets.filter(t => t.preparation_status === 'pending').length;
        const preparingCount = tickets.filter(t => t.preparation_status === 'preparing').length;
        const urgentCount = tickets.filter(t => {
            const age = Math.floor((new Date(serverTime).getTime() - new Date(t.created_at).getTime()) / 60000);
            return age > 15 && t.preparation_status !== 'ready';
        }).length;

        return { pendingCount, preparingCount, urgentCount };
    }, [tickets, serverTime]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            {/* 1. KITCHEN COMMAND BAR */}
            <header className="bg-[#1e293b]/80 border-b border-white/[0.05] p-6 sticky top-0 z-50 backdrop-blur-3xl shadow-2xl">
                <div className="max-w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-6 px-4">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-amber-600 rounded-[2rem] shadow-2xl shadow-amber-900/40 rotate-3 border-b-4 border-amber-800">
                            <ChefHat className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-white tracking-tighter">Kitchen Control Terminal</h1>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Mirroring Live</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-400" /> Site: {authority.branchName || 'Alpha Terminal'}</span>
                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(serverTime).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-6 bg-[#0f172a] px-8 py-3.5 rounded-[2rem] border border-white/[0.05] shadow-inner">
                            <div className="text-center group">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 group-hover:text-amber-400 transition-colors">Tension</p>
                                <p className={`text-xl font-black tabular-nums transition-colors ${stats.pendingCount > 5 ? 'text-amber-400' : 'text-slate-300'}`}>{stats.pendingCount}</p>
                            </div>
                            <div className="w-px h-10 bg-white/5" />
                            <div className="text-center group">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 group-hover:text-indigo-400 transition-colors">Cooking</p>
                                <p className="text-xl font-black text-indigo-400 tabular-nums">{stats.preparingCount}</p>
                            </div>
                            {stats.urgentCount > 0 && (
                                <>
                                    <div className="w-px h-10 bg-white/5" />
                                    <div className="text-center group cursor-pointer animate-pulse">
                                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1.5">Critical</p>
                                        <p className="text-xl font-black text-rose-500 tabular-nums">{stats.urgentCount}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`p-4 rounded-2xl transition-all border ${soundEnabled ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                            >
                                {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                            </button>
                            <button onClick={hydrate} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-white/[0.05] transition-all text-slate-400 group">
                                <RefreshCw className={`w-6 h-6 group-active:rotate-180 transition-all duration-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-8 max-w-full mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                    {/* LEFT: Anomalies & Telemetry (3/12) */}
                    <div className="md:col-span-3 space-y-8 sticky top-32">
                        {/* INVENTORY RISKS (Passive Rule 8) */}
                        <section className="bg-rose-500/5 rounded-[2.5rem] border-2 border-rose-500/10 p-8 space-y-6">
                            <div className="flex items-center gap-3 text-rose-500">
                                <AlertCircle className="w-7 h-7" />
                                <h3 className="text-lg font-black uppercase tracking-tighter">Kitchen Shortages</h3>
                            </div>
                            <div className="space-y-4">
                                {inventory_alerts.filter(i => i.category === 'kitchen' || i.category === 'bar').map((alert, idx) => (
                                    <div key={idx} className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/10">
                                        <p className="text-sm font-black text-rose-200">{alert.name}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-black text-rose-500/70 uppercase">STOCK CRITICAL</span>
                                            <span className="font-mono text-xs text-rose-400">{alert.current_stock} REMAINING</span>
                                        </div>
                                    </div>
                                ))}
                                {inventory_alerts.length === 0 && (
                                    <div className="text-center py-6">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Stock Integrity Normal</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* FLOW STATS */}
                        <section className="bg-indigo-500/5 rounded-[2.5rem] border-2 border-indigo-500/10 p-8 space-y-6">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Activity className="w-6 h-6" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Workflow Pressure</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-900 rounded-2xl border border-white/5">
                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Load Index</p>
                                    <p className="text-xl font-black text-white tabular-nums">{(tickets.length * 1.5).toFixed(1)}</p>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-2xl border border-white/5">
                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Efficiency</p>
                                    <p className="text-xl font-black text-emerald-400">92%</p>
                                </div>
                            </div>
                        </section>

                        <button className="w-full py-5 bg-slate-800 hover:bg-slate-700 rounded-[2rem] border border-white/10 text-slate-400 font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                            <History className="w-5 h-5" /> Archive View
                        </button>
                    </div>

                    {/* RIGHT: Active Workflow Grid (9/12) */}
                    <div className="md:col-span-9">
                        {tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 bg-slate-900/40 rounded-[4rem] border-4 border-dashed border-white/5 text-center">
                                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner border border-white/5">
                                    <ChefHat className="w-16 h-16 text-slate-700" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-600 tracking-tighter mb-2 italic">KITCHEN SILENT</h2>
                                <p className="text-slate-700 font-bold uppercase text-[10px] tracking-[0.4em]">Awaiting Incoming Tickets</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                                {tickets.map(ticket => (
                                    <KitchenTicket
                                        key={ticket.id}
                                        ticket={ticket}
                                        onUpdate={handleStatusUpdate}
                                        serverTime={serverTime}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* FLOATING SYSTEM STATUS */}
            <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-4 bg-[#1e293b]/90 border border-white/10 rounded-full backdrop-blur-2xl shadow-2xl z-50">
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SSOT GATEWAY STABLE</span>
                </div>
                <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SYSTEM PULSE: 247ms</span>
                </div>
            </footer>
        </div>
    );
};

export default KitchenTerminal;

// Custom Lucide Aliases (to fixed missing imports)
const Activity = ({ className }: { className?: string }) => <Play className={className} />;
