
import React, { useState, useEffect } from 'react';
import { useShift } from '@/hooks/useShift';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Wallet, DollarSign, Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ShiftMonitor: React.FC = () => {
    const { currentShift, startShift, endShift, loading } = useShift();

    // Reconciliation State
    const [showReconcile, setShowReconcile] = useState(false);
    const [totals, setTotals] = useState({
        expected_cash: 0,
        expected_pos: 0,
        expected_transfer: 0
    });
    const [inputs, setInputs] = useState({
        counted_cash: '',
        pos_machine_total: '',
        transfer_total: ''
    });

    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (currentShift) {
            fetchShiftData();

            // Subscribe to transactions for this shift
            const channel = supabase
                .channel(`shift_tx_${currentShift.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'transactions', filter: `shift_id=eq.${currentShift.id}` },
                    () => fetchShiftData()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentShift]);

    const fetchShiftData = async () => {
        if (!currentShift) return;

        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('shift_id', currentShift.id);

        if (data) {
            setTransactions(data);

            // Calculate Expecteds
            const cash = data.filter(t => t.payment_type === 'cash').reduce((sum, t) => sum + Number(t.amount), 0);
            const pos = data.filter(t => t.payment_type === 'pos').reduce((sum, t) => sum + Number(t.amount), 0);
            const transfer = data.filter(t => t.payment_type === 'transfer' || t.payment_type === 'wallet').reduce((sum, t) => sum + Number(t.amount), 0);

            setTotals({
                expected_cash: cash,
                expected_pos: pos,
                expected_transfer: transfer
            });
        }
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

    // Variance Calc for UI
    const getVariance = () => {
        const cash = parseFloat(inputs.counted_cash) || 0;
        const pos = parseFloat(inputs.pos_machine_total) || 0;
        const transfer = parseFloat(inputs.transfer_total) || 0;

        return (cash - totals.expected_cash) + (pos - totals.expected_pos) + (transfer - totals.expected_transfer);
    };

    if (loading) return <div className="p-4 bg-white rounded-xl shadow animate-pulse h-24"></div>;

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
                <p className="text-xs text-emerald-600 mt-4">Audit ID: {new Date().getTime().toString(36).toUpperCase()}</p>
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
                    {/* CASH */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected Cash</span>
                            <span>₦{totals.expected_cash.toLocaleString()}</span>
                        </div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Actual Count</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.counted_cash}
                            onChange={e => setInputs({ ...inputs, counted_cash: e.target.value })}
                        />
                    </div>

                    {/* POS */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected POS</span>
                            <span>₦{totals.expected_pos.toLocaleString()}</span>
                        </div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Machine Total</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.pos_machine_total}
                            onChange={e => setInputs({ ...inputs, pos_machine_total: e.target.value })}
                        />
                    </div>

                    {/* TRANSFER */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2 text-sm font-semibold text-slate-600">
                            <span>Expected Transfer</span>
                            <span>₦{totals.expected_transfer.toLocaleString()}</span>
                        </div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Verified Total</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded font-mono text-lg"
                            placeholder="0.00"
                            value={inputs.transfer_total}
                            onChange={e => setInputs({ ...inputs, transfer_total: e.target.value })}
                        />
                    </div>

                    {/* VARIANCE DISPLAY */}
                    <div className={`p-4 rounded-lg flex justify-between items-center font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        <span>Variance</span>
                        <span>{variance > 0 ? '+' : ''}₦{variance.toLocaleString()}</span>
                    </div>

                    {variance !== 0 && (
                        <div className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Manager approval required to close with variance.
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowReconcile(false)}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleCloseShift}
                            disabled={variance !== 0} // Strict as per Phase 4: "Prevent shift closure... If variance != 0 -> require manager approval" (Currently blocking, assumes manager approves elsewhere or staff fixes count)
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Started: {new Date(currentShift.start_time).toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => setShowReconcile(true)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                >
                    <Power className="w-4 h-4" />
                    End Shift
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl">
                    <p className="text-slate-400 text-xs uppercase font-bold">Total Revenue</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-400">
                        ₦{(totals.expected_cash + totals.expected_pos + totals.expected_transfer).toLocaleString()}
                    </p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                    <p className="text-slate-400 text-xs uppercase font-bold flex items-center gap-1"><Wallet className="w-3 h-3" /> Cash</p>
                    <p className="text-lg font-bold mt-1">₦{totals.expected_cash.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                    <p className="text-slate-400 text-xs uppercase font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> POS</p>
                    <p className="text-lg font-bold mt-1">₦{totals.expected_pos.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                    <p className="text-slate-400 text-xs uppercase font-bold">Transfer</p>
                    <p className="text-lg font-bold mt-1">₦{totals.expected_transfer.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-3">Recent Transactions</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex justify-between items-center text-sm bg-slate-800/50 p-2 rounded">
                            <span className="font-mono text-slate-500">#{tx.id.slice(0, 8)}</span>
                            <span className="capitalize text-slate-300">{tx.payment_type}</span>
                            <span className="font-bold">₦{tx.amount.toLocaleString()}</span>
                        </div>
                    ))}
                    {transactions.length === 0 && <p className="text-slate-600 text-xs">No transactions yet.</p>}
                </div>
            </div>
        </div>
    );
};

export default ShiftMonitor;
