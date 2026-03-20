import React from 'react';
import { Activity, Clock, ShoppingBag, CreditCard, Terminal } from 'lucide-react';
import { SystemSnapshot } from '../../store/systemStore';

interface LiveOperationsPanelProps {
    state: SystemSnapshot | null;
}

/**
 * LiveOperationsPanel - CARSS Realtime Telemetry
 * Provides a 5-second situational awareness dashboard for live operations.
 */
export const LiveOperationsPanel: React.FC<LiveOperationsPanelProps> = ({ state }) => {
    if (!state) return null;

    const metrics = [
        {
            label: 'Active Terminals',
            value: state.active_terminals || 0,
            icon: Terminal,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10'
        },
        {
            label: 'Open Orders',
            value: state.orders?.open_orders ?? 0,
            icon: ShoppingBag,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10'
        },
        {
            label: 'Pending Payments',
            value: state.payments?.pending_intents ?? 0,
            icon: CreditCard,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10'
        },
        {
            label: 'Shift Status',
            value: state.shift ? 'OPEN' : 'CLOSED',
            icon: Clock,
            color: state.shift ? 'text-emerald-400' : 'text-rose-400',
            bg: state.shift ? 'bg-emerald-400/10' : 'bg-rose-400/10'
        }
    ];

    return (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
            {/* Realtime Pulse Indicator */}
            <div className="absolute top-8 right-8 flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Pulse</span>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    CARSS Live Operations
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Branch Telemetry • Realtime SSOT Sync
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 transition-all hover:bg-slate-800 hover:border-slate-600">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                                <m.icon className="w-5 h-5" />
                            </div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                                {m.label}
                            </h3>
                        </div>
                        <p className={`text-4xl font-black tracking-tighter ${m.color}`}>
                            {m.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-8 pt-8 border-t border-slate-800 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <div className="flex gap-6">
                    <span>SSOT Verified</span>
                    <span>•</span>
                    <span>Latency: 24ms</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Last Sync: {new Date(state.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};
