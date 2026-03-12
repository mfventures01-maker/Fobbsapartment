import React, { useState } from 'react';
import { useShiftState } from '@/contexts/ShiftContext';
import { Banknote, CreditCard, Send, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { safeNumber } from '@/lib/safeNumber';
import { SHIFT_STATUS } from '@/constants/shiftStatus';

const ShiftDeclarationScreen: React.FC = () => {
    const { shiftState, submitDeclaration } = useShiftState();
    const [loading, setLoading] = useState(false);
    const [declaration, setDeclaration] = useState({
        cash: 0,
        pos: 0,
        transfer: 0
    });

    if (shiftState.status !== SHIFT_STATUS.DECLARATION_SUBMITTED) return null;

    const { shift } = shiftState;

    const totalDeclared = Number(declaration.cash) + Number(declaration.pos) + Number(declaration.transfer);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalDeclared === 0) {
            if (!window.confirm('You are declaring 0 revenue. Is this correct?')) return;
        }

        setLoading(true);
        const { error, data } = await submitDeclaration(declaration);
        if (error) {
            toast.error(error.message || 'Submission failed');
            setLoading(false);
        } else {
            toast.success(`Declaration submitted! Variance: ₦${data.variance}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="text-center space-y-2 mb-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-amber-700" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 font-serif">Shift Declaration</h1>
                    <p className="text-gray-500 text-sm">Review your collected totals and submit for manager approval.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Cash Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <Banknote className="w-3 h-3" /> Cash
                            </label>
                            <input
                                type="number"
                                required
                                value={declaration.cash}
                                onChange={(e) => setDeclaration({ ...declaration, cash: Number(e.target.value) })}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:border-amber-500 transition-all outline-none"
                                placeholder="₦0.00"
                            />
                        </div>

                        {/* POS Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> POS
                            </label>
                            <input
                                type="number"
                                required
                                value={declaration.pos}
                                onChange={(e) => setDeclaration({ ...declaration, pos: Number(e.target.value) })}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:border-amber-500 transition-all outline-none"
                                placeholder="₦0.00"
                            />
                        </div>

                        {/* Transfer Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <Send className="w-3 h-3 rotate-45" /> Transfer
                            </label>
                            <input
                                type="number"
                                required
                                value={declaration.transfer}
                                onChange={(e) => setDeclaration({ ...declaration, transfer: Number(e.target.value) })}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:border-amber-500 transition-all outline-none"
                                placeholder="₦0.00"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-amber-800 font-bold flex items-center gap-2">
                                <Calculator className="w-4 h-4" /> Total Declaration
                            </span>
                            <span className="text-2xl font-black text-amber-950 font-mono">
                                ₦{safeNumber(totalDeclared)}
                            </span>
                        </div>
                        <div className="h-px bg-amber-200/50 my-3" />
                        <div className="flex items-start gap-3 mt-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                Once submitted, you cannot edit these values. The system will automatically compare this to your transaction logs and calculate variance for manager audit.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Final Declaration'}
                        {!loading && <CheckCircle2 className="w-5 h-5" />}
                    </button>

                    <div className="text-center">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">Shift ID: {shift.id}</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShiftDeclarationScreen;
