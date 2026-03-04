import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import {
    Clock, Bell, ArrowRight,
    ShoppingCart, ShieldCheck, Zap,
    LayoutGrid, History, Settings, ExternalLink,
    AlertCircle, TrendingUp
} from 'lucide-react';
import POSTerminal from '@/components/pos/POSTerminal';

const StaffDashboardPage: React.FC = () => {
    const { user, departmentName } = useAuth();
    const { shiftState } = useShiftState();
    const [showTerminal, setShowTerminal] = useState(false);

    const title = departmentName
        ? `${departmentName} Hub`
        : 'Operations Hub';

    if (showTerminal) {
        // Ensure department is one of the allowed types for POSTerminal
        const terminalDept = (departmentName === 'Restaurant' || departmentName === 'Bar')
            ? departmentName
            : 'Generic';

        return (
            <div className="animate-in fade-in duration-500">
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={() => setShowTerminal(false)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Back to Hub
                    </button>
                    <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        Secure POS Session
                    </div>
                </div>
                <POSTerminal department={terminalDept} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em]">
                        <Zap className="w-3 h-3 fill-current" />
                        Anti-Gravity Core
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                        {title}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Welcome back, <span className="text-slate-900 font-bold">{user?.email?.split('@')[0] || 'Staff Member'}</span>. All systems nominal.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                        <Bell className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                        <Settings className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => setShowTerminal(true)}
                            className="group relative overflow-hidden bg-emerald-900 p-8 rounded-[2.5rem] text-white text-left transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-emerald-900/20"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
                            <ShoppingCart className="w-10 h-10 mb-4 text-emerald-400" />
                            <h3 className="text-xl font-bold mb-1">Open POS Terminal</h3>
                            <p className="text-emerald-100/60 text-sm font-medium">Create orders, process payments, and manage floor sales.</p>
                            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Launch Secure Matrix <ExternalLink className="w-3 h-3" />
                            </div>
                        </button>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-indigo-50 rounded-2xl">
                                    <Clock className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    <TrendingUp className="w-3 h-3" />
                                    On Track
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Current Session</p>
                                <h4 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {shiftState.status === 'active' ? '4h 12m' : '--:--'}
                                </h4>
                            </div>
                        </div>
                    </div>

                    {/* Assignments / Tasks */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-indigo-600" />
                                    Active Assignments
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">Real-time task synchronization across departments.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                                Sync Online
                            </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {[
                                { id: 1, title: 'Urgent Request: Room 204', time: '10 mins ago', urgent: true, type: 'Guest Service' },
                                { id: 2, title: 'Routine Check: Lobby Area', time: '45 mins ago', urgent: false, type: 'Maintenance' },
                                { id: 3, title: 'Assist Guest: Poolside', time: '1 hour ago', urgent: false, type: 'Porter' }
                            ].map((task) => (
                                <div key={task.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1.5 w-2 h-2 rounded-full ring-4 shadow-sm ${task.urgent ? 'bg-rose-500 ring-rose-50' : 'bg-emerald-500 ring-emerald-50'}`}></div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{task.type}</p>
                                            <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Assigned {task.time}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full py-6 bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center gap-2 border-t border-slate-100">
                            <History className="w-4 h-4" />
                            View Historical Logs
                        </button>
                    </div>
                </div>

                {/* Sidebar Alerts / Info */}
                <div className="space-y-8">
                    {/* Shift Integrity Card */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl -mr-12 -mt-12" />
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            Integrity Status
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Shift ID</span>
                                <span className="text-xs font-mono font-black text-emerald-400">{shiftState.status === 'active' ? shiftState.shift.id.slice(0, 8) : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Auth Status</span>
                                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Verified</span>
                            </div>

                            <div className="pt-6 border-t border-slate-800">
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-start gap-4">
                                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        You are currently operating in a <span className="text-white font-bold">Hardened Financial Session</span>. All transactions are trace-mapped to your Shift ID.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Activity Summary
                        </h3>
                        <div className="space-y-4">
                            <StatBar label="Handled Items" value={15} max={25} color="bg-emerald-500" />
                            <StatBar label="Total Revenue contribution" value={85} max={100} color="bg-indigo-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBar = ({ label, value, max, color }: any) => {
    const percentage = (value / max) * 100;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{label}</span>
                <span>{value} / {max}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default StaffDashboardPage;

