import React from 'react';
import { Terminal, Shield, Clock, Monitor } from 'lucide-react';

interface TerminalRadarProps {
    terminals: any[];
}

/**
 * TerminalRadar - CARSS Autonomous Discovery
 * Provides a live view of all operating terminals in the building.
 */
export const TerminalRadar: React.FC<TerminalRadarProps> = ({ terminals = [] }) => {
    return (
        <section className="bg-slate-900/40 rounded-[2rem] border border-slate-800 p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Autonomous Terminal Discovery</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Presence Radar</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        {terminals.length} ACTIVE BLIPS
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {terminals.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700/50">
                        <Monitor className="w-8 h-8 text-slate-700 mx-auto" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No terminals detected in area</p>
                    </div>
                ) : (
                    terminals.map((t) => (
                        <div key={t.id} className="group bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between transition-all hover:bg-slate-800 hover:border-indigo-500/30">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                                        <Terminal className="w-4 h-4" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-white">{t.staff_name}</p>
                                        <span className="text-[9px] font-black text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                            {t.terminal_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                        <Monitor className="w-3 h-3" /> {t.device_info}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-500 flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" /> {new Date(t.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                                    {t.department || 'Operations'} Station
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Radar Footer */}
            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Connected</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Discovery Active</span>
                    </div>
                </div>
                <div className="text-slate-600 text-[8px] font-black uppercase tracking-[0.2em]">
                    Realtime Persistence Engine
                </div>
            </div>
        </section>
    );
};
