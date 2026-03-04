import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import {
    ClipboardList,
    ShieldCheck, CheckCircle, XCircle,
    Clock, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToShiftTelemetry } from '@/lib/realtimeTelemetry';

const ReconciliationRow = ({ label, expected, declared }: { label: string, expected: number, declared: number }) => {
    const diff = declared - expected;
    return (
        <tr>
            <td className="px-6 py-4 font-medium text-slate-700">{label}</td>
            <td className="px-6 py-4 text-right font-mono">₦{Number(expected || 0).toLocaleString()}</td>
            <td className="px-6 py-4 text-right font-mono">₦{Number(declared || 0).toLocaleString()}</td>
            <td className={`px-6 py-4 text-right font-mono font-bold ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {diff === 0 ? '-' : `₦${diff.toLocaleString()}`}
            </td>
        </tr>
    );
};

const ManagerDashboard: React.FC = () => {
    const { authority } = useAuth();
    const { approveShift, rejectShift } = useShiftState();
    const [pendingShifts, setPendingShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = useCallback(async () => {
        if (authority.status !== 'authorized') return;
        setLoading(true);

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('business_id', authority.businessId)
            .in('status', ['awaiting_manager_open', 'pending_declaration', 'awaiting_manager_approval']);

        if (error) {
            toast.error('Failed to load pending shifts');
        } else {
            setPendingShifts(data || []);
        }
        setLoading(false);
    }, [authority]);

    useEffect(() => {
        fetchPending();

        // STEP 2 — MANAGER DASHBOARD TELEMETRY
        const unsubscribe = subscribeToShiftTelemetry(() => {
            console.log('[TELEMETRY] Shift change detected, refetching...');
            fetchPending();
        });

        return unsubscribe;
    }, [fetchPending]);

    const handleOpenApprove = async (id: string) => {
        if (!window.confirm('Approve this staff to start their shift?')) return;
        const { error } = await supabase.rpc('manager_open_shift', { p_shift: id });
        if (error) {
            toast.error(error.message || 'Opening failed');
        } else {
            toast.success('Shift opened successfully');
            fetchPending();
        }
    };

    const handleApprove = async (id: string) => {
        if (!window.confirm('Approve and close this shift?')) return;
        const { error } = await approveShift(id);
        if (error) {
            toast.error(error.message || 'Approval failed');
        } else {
            toast.success('Shift approved');
            fetchPending();
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt('Enter rejection reason:');
        if (!reason) return;

        const { error } = await rejectShift(id, reason);
        if (error) {
            toast.error(error.message || 'Rejection failed');
        } else {
            toast.success('Shift rejected back to staff');
            fetchPending();
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-black text-emerald-950 tracking-tight">Manager Command</h1>
                    <p className="text-gray-500 font-medium">Overseeing operations and shift integrity.</p>
                </div>
                <button onClick={fetchPending} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Shift Approvals Section */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Shift Approvals</h2>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Awaiting Final Reconciliation</p>
                    </div>
                </div>

                <div className="p-4 sm:p-8">
                    {loading ? (
                        <div className="py-12 flex justify-center"><Clock className="animate-spin text-slate-200 w-12 h-12" /></div>
                    ) : pendingShifts.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic">No shifts currently awaiting approval.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {pendingShifts.map(shift => (
                                <div key={shift.id} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex flex-col gap-6 group hover:border-indigo-200 transition-all shadow-sm">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Shift ID: {shift.id.slice(0, 8)}</span>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded uppercase">{shift.department_id}</span>
                                                {shift.status === 'awaiting_manager_open' && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Awaiting Opening
                                                    </span>
                                                )}
                                                {shift.status === 'awaiting_manager_approval' && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded uppercase flex items-center gap-1">
                                                        <ShieldCheck className="w-3 h-3" /> Awaiting Closure
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium tracking-tight">
                                                Staff ID: {shift.staff_id.slice(0, 16)}... |
                                                Started: {new Date(shift.start_time).toLocaleTimeString()}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            {shift.status === 'awaiting_manager_open' ? (
                                                <button
                                                    onClick={() => handleOpenApprove(shift.id)}
                                                    className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-700 transition-all shadow-lg active:scale-95"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    Approve Opening
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleReject(shift.id)}
                                                        className="p-3 bg-white border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all"
                                                        title="Reject Shift"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(shift.id)}
                                                        className="bg-emerald-950 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-emerald-900 transition-all shadow-lg active:scale-95 border border-white/10"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Verify & Close Shift
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {shift.status === 'awaiting_manager_approval' && (
                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                                        <th className="px-6 py-3">Category</th>
                                                        <th className="px-6 py-3 text-right">Expected</th>
                                                        <th className="px-6 py-3 text-right">Declared</th>
                                                        <th className="px-6 py-3 text-right">Variance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    <ReconciliationRow label="Cash" expected={shift.expected_cash} declared={shift.declared_cash} />
                                                    <ReconciliationRow label="POS" expected={shift.expected_pos} declared={shift.declared_pos} />
                                                    <ReconciliationRow label="Transfer" expected={shift.expected_transfer} declared={shift.declared_transfer} />
                                                    <tr className="bg-slate-50/50 font-black">
                                                        <td className="px-6 py-4">Total</td>
                                                        <td className="px-6 py-4 text-right">₦{Number(shift.expected_total || shift.expected_revenue || 0).toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right">₦{Number(shift.declared_total || 0).toLocaleString()}</td>
                                                        <td className={`px-6 py-4 text-right ${shift.variance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            ₦{Number(shift.variance || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Existing Lists or Placeholder */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    Operational Request Monitor
                </h3>
                <div className="text-center py-12 text-slate-400 italic text-sm">
                    No active requests in current department.
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
