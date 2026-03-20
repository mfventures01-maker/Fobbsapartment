import React, { useState } from 'react';
import { useShift } from '@/hooks/useShift';
import { useSystemState } from '@/hooks/useSystemState';
import { Clock, Wallet, DollarSign, Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import { safeNumber } from '@/lib/safeNumber';

const ShiftMonitor: React.FC = () => {
    const { currentShift, startShift, endShift, loading: shiftLoading } = useShift();
    const {
        revenue,
        recent_transactions: transactions,
        loading: systemLoading
    } = useSystemState();

    const loading = shiftLoading || systemLoading;

    // Reconciliation State (Local UI only, for submission preparation)
    const [showReconcile, setShowReconcile] = useState(false);
    const [inputs, setInputs] = useState({
        counted_cash: '',
        pos_machine_total: '',
        transfer_total: ''
    });

    // Authority: Totals are derived from backend SSOT only
    const totals = {
        expected_cash: revenue.shift_cash || 0,
        expected_pos: revenue.shift_pos || 0,
        expected_transfer: revenue.shift_transfer || 0
    };

    const handleCloseShift = async () => {
        const cash = parseFloat(inputs.counted_cash) || 0;
        const pos = parseFloat(inputs.pos_machine_total) || 0;
        const transfer = parseFloat(inputs.transfer_total) || 0;

        await endShift({
            expected_cash: totals.expected_cash,
            counted_cash: cash,
            expected_pos: totals.expected_pos,
            pos_machine_total: pos,
            expected_transfer: totals.expected_transfer,
            transfer_total: transfer
        });
        setShowReconcile(false);
    };

    const getVariance = () => {
        const cash = parseFloat(inputs.counted_cash) || 0;
        const pos = parseFloat(inputs.pos_machine_total) || 0;
        const transfer = parseFloat(inputs.transfer_total) || 0;

        return (cash - totals.expected_cash) + (pos - totals.expected_pos) + (transfer - totals.expected_transfer);
    };

    if (loading && !currentShift) return <div className="p-4 bg-white rounded-xl shadow animate-pulse h-24"></div>;

    if (!currentShift) {
        return (
            <div className="bg-emerald-900 text-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-4">
                <ShieldCheck className="w-12 h-12 text-emerald-400" />
                <h2 className="text-2xl font-bold">Shift Inactive</h2>
                <p className="text-emerald-200">You must start a shift to process transactions.</p>
                <button
                    onClick={startShift}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full transition-all shadow-lg shadow-emerald-900/50"
                >
                    START SHIFT NOW
                </button>
            </div>
        );
    }

    if (showReconcile) {
        const variance = getVariance();
        return (
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-slate-900 max-w-md mx-auto">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" />
                    Shift Reconciliation
                </h2>

                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected Cash</span>
                            <span>₦{safeNumber(totals.expected_cash)}</span>
                        </div>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.counted_cash}
                            onChange={e => setInputs({ ...inputs, counted_cash: e.target.value })}
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected POS</span>
                            <span>₦{safeNumber(totals.expected_pos)}</span>
                        </div>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.pos_machine_total}
                            onChange={e => setInputs({ ...inputs, pos_machine_total: e.target.value })}
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected Transfer</span>
                            <span>₦{safeNumber(totals.expected_transfer)}</span>
                        </div>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.transfer_total}
                            onChange={e => setInputs({ ...inputs, transfer_total: e.target.value })}
                        />
                    </div>

                    <div className={`p-4 rounded-lg flex justify-between items-center font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        <span>Variance</span>
                        <span>{variance > 0 ? '+' : ''}₦{safeNumber(variance)}</span>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setShowReconcile(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg">Back</button>
                        <button
                            onClick={handleCloseShift}
                            disabled={variance !== 0}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50"
                        >
                            CONFIRM CLOSE
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="text-emerald-400" />
                        Shift Active
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Started: {new Date(currentShift.started_at || currentShift.start_time).toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => setShowReconcile(true)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-50"
                >
                    End Shift
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">₦{safeNumber(revenue.shift_total)}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Cash</p>
                    <p className="text-lg font-black">{safeNumber(revenue.shift_cash)}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">POS</p>
                    <p className="text-lg font-black">{safeNumber(revenue.shift_pos)}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Transfer</p>
                    <p className="text-lg font-black">{safeNumber(revenue.shift_transfer)}</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Shift Ledger Pulse</h3>
                <div className="space-y-2">
                    {transactions?.filter((tx: any) => tx.shift_id === currentShift.id).slice(0, 5).map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                            <span className="font-mono text-slate-500">#{tx.id.slice(0, 8)}</span>
                            <span className="font-bold text-slate-300 uppercase tracking-tighter">{tx.payment_type}</span>
                            <span className="font-black text-emerald-400">₦{safeNumber(tx.amount)}</span>
                        </div>
                    ))}
                    {transactions?.length === 0 && <p className="text-slate-600 text-xs italic">No transactions processed today.</p>}
                </div>
            </div>
        </div>
    );
};

export default ShiftMonitor;
