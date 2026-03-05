import React, { useState, useEffect } from 'react';
import { useShiftState } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Calculator, AlertCircle, CheckCircle2, SendHorizonal } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftSettlementPanelProps {
    shiftId: string;
    onSuccess?: () => void;
}

const ShiftSettlementPanel: React.FC<ShiftSettlementPanelProps> = ({ shiftId, onSuccess }) => {
    const { submitDeclaration } = useShiftState();
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState({
        system_cash: 0,
        system_pos: 0,
        system_transfer: 0
    });

    const [inputs, setInputs] = useState({
        cash: '',
        pos: '',
        transfer: ''
    });

    useEffect(() => {
        const fetchSystemTotals = async () => {
            console.log('[SETTLEMENT] Fetching system totals for reconciliation...');
            const { data } = await supabase
                .from('transactions')
                .select('amount, payment_type')
                .eq('shift_id', shiftId)
                .in('status', ['verified', 'completed']);

            if (data) {
                const totals = data.reduce((acc, tx) => {
                    const method = tx.payment_type?.toLowerCase();
                    if (method === 'cash') acc.system_cash += Number(tx.amount);
                    else if (method === 'pos') acc.system_pos += Number(tx.amount);
                    else acc.system_transfer += Number(tx.amount);
                    return acc;
                }, { system_cash: 0, system_pos: 0, system_transfer: 0 });
                setStats(totals);
            }
        };

        fetchSystemTotals();
    }, [shiftId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            cash: parseFloat(inputs.cash) || 0,
            pos: parseFloat(inputs.pos) || 0,
            transfer: parseFloat(inputs.transfer) || 0
        };

        const totalDeclared = payload.cash + payload.pos + payload.transfer;
        const totalSystem = stats.system_cash + stats.system_pos + stats.system_transfer;
        const variance = totalDeclared - totalSystem;

        if (variance !== 0) {
            if (!window.confirm(`Warning: Variance detected (₦${variance.toLocaleString()}). Submit for manager investigation?`)) {
                setSubmitting(false);
                return;
            }
        }

        const { error } = await submitDeclaration(payload);

        if (error) {
            toast.error(error.message || 'Failed to submit declaration');
            setSubmitting(false);
        } else {
            toast.success('Declaration Submitted — Shift Locked');
            onSuccess?.();
        }
    };

    const totalSystem = stats.system_cash + stats.system_pos + stats.system_transfer;
    const totalDeclared = (parseFloat(inputs.cash) || 0) + (parseFloat(inputs.pos) || 0) + (parseFloat(inputs.transfer) || 0);
    const variance = totalDeclared - totalSystem;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-8 max-w-lg mx-auto animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-50 rounded-2xl">
                    <Calculator className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Shift Settlement</h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reconciliation & Declaration</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6">
                    {/* CASH INPUT */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Physical Cash</label>
                            <span className="text-[10px] font-bold text-slate-400">System: ₦{stats.system_cash.toLocaleString()}</span>
                        </div>
                        <input
                            required
                            type="number"
                            placeholder="Counted cash amount..."
                            value={inputs.cash}
                            onChange={e => setInputs(prev => ({ ...prev, cash: e.target.value }))}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-amber-500 focus:outline-none transition-all"
                        />
                    </div>

                    {/* POS INPUT */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">POS Machine Total</label>
                            <span className="text-[10px] font-bold text-slate-400">System: ₦{stats.system_pos.toLocaleString()}</span>
                        </div>
                        <input
                            required
                            type="number"
                            placeholder="POS report total..."
                            value={inputs.pos}
                            onChange={e => setInputs(prev => ({ ...prev, pos: e.target.value }))}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-amber-500 focus:outline-none transition-all"
                        />
                    </div>

                    {/* TRANSFER INPUT */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Verified Transfers</label>
                            <span className="text-[10px] font-bold text-slate-400">System: ₦{stats.system_transfer.toLocaleString()}</span>
                        </div>
                        <input
                            required
                            type="number"
                            placeholder="Transfer/Wallet total..."
                            value={inputs.transfer}
                            onChange={e => setInputs(prev => ({ ...prev, transfer: e.target.value }))}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-2xl font-black text-slate-900 focus:border-amber-500 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border-2 flex flex-col gap-1 transition-colors ${variance === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                        <span className={variance === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {variance === 0 ? 'Balance Perfect' : 'Variance Detected'}
                        </span>
                        <span className={variance === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            ₦{variance.toLocaleString()}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">
                        {variance === 0
                            ? 'The system totals match your physical count perfectly.'
                            : 'Manager approval will be required to justify this discrepancy.'}
                    </p>
                </div>

                <button
                    disabled={submitting}
                    className="w-full bg-slate-900 text-white rounded-[1.5rem] py-5 font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : (
                        <>
                            Submit Declaration <SendHorizonal className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default ShiftSettlementPanel;
