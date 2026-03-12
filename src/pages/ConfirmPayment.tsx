import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useShift } from '@/hooks/useShift';
import { CreditCard, Banknote, Smartphone, CheckCircle, AlertTriangle, ShieldCheck, Loader2, ArrowLeft, Landmark } from 'lucide-react';
import { safeNumber } from '@/lib/safeNumber';

interface Order {
    id: string;
    status: 'open' | 'paid' | 'void' | 'refunded';
    total: number;
    payment_intent: string | null;
    org_id: string;
    location_id: string;
    created_by: string;
}

const ConfirmPayment: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('order_id');
    const { user, currentRole } = useAuth();
    const { currentShift } = useShift();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Editable state
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
    const [receiptId, setReceiptId] = useState('');
    const [intentId, setIntentId] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setError('Missing Order ID');
            setLoading(false);
            return;
        }
        fetchOrderAndIntent();
    }, [orderId]);

    const fetchOrderAndIntent = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .single();

            if (orderError) throw new Error("Order not found");
            if (!orderData) throw new Error("Order does not exist");

            setOrder(orderData);

            if (orderData.status !== 'open') {
                if (orderData.status === 'paid') {
                    setSuccess(true);
                    return;
                }
                throw new Error(`Order already processed (Status: ${orderData.status})`);
            }

            // Fetch Pending Intent
            const { data: intentData } = await supabase
                .from('payment_intents')
                .select('*')
                .eq('order_id', orderId)
                .eq('status', 'pending')
                .maybeSingle();

            if (intentData) {
                setIntentId(intentData.id);
                setSelectedPayment(intentData.payment_type);
                if (intentData.external_reference) setReceiptId(intentData.external_reference);
            } else if (orderData.payment_intent) {
                setSelectedPayment(orderData.payment_intent);
            }

        } catch (err: any) {
            setError(err.message || 'Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!order || !user) return;
        if (processing) return;

        // Shift Check - Mandatory for Bar Staff
        if (currentRole === 'staff' && !currentShift) {
            setError("No active shift found. Please start a shift first.");
            return;
        }

        if (!selectedPayment) {
            setError("Please select a payment method");
            return;
        }
        if ((selectedPayment === 'pos' || selectedPayment === 'transfer') && !receiptId.trim()) {
            setError(`${selectedPayment.toUpperCase()} Reference/Receipt ID is required for verification`);
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            if (!supabase) throw new Error('System offline');

            let finalIntentId = intentId;

            // JIT Intent creation if missing
            if (!finalIntentId) {
                const { data: newIntent, error: createError } = await supabase
                    .from('payment_intents')
                    .insert({
                        order_id: order.id,
                        org_id: order.org_id,
                        branch_id: order.location_id,
                        staff_id: user.id,
                        shift_id: currentShift?.id || null, // Optional for CEO/Manager if not in a shift
                        expected_amount: order.total,
                        payment_type: selectedPayment,
                        status: 'pending',
                        external_reference: receiptId || null
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                finalIntentId = newIntent.id;
            }

            // ATOMIC SETTLEMENT
            const { error: rpcError } = await supabase.rpc('confirm_payment_intent', {
                p_intent_id: finalIntentId,
                p_external_reference: receiptId || null
            });

            if (rpcError) throw rpcError;

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Payment confirmation failed");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium tracking-wide">Fetching Order Ledger...</p>
            </div>
        );
    }

    if (error && !order) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-sm w-full">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-8">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[32px] max-w-sm w-full shadow-2xl shadow-emerald-500/5">
                    <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/40 rotate-12 scale-110">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Settlement Success</h2>
                    <p className="text-slate-400 font-medium mb-8">Transaction recorded in general ledger.</p>
                    <div className="bg-white/5 rounded-2xl p-4 mb-8 text-left space-y-2 border border-white/10">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                            <span>Order ID</span>
                            <span className="text-white">#{order?.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                            <span>Amount</span>
                            <span className="text-emerald-400">₦{safeNumber(order?.total)}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-black transition-all shadow-lg shadow-emerald-900/40"
                    >
                        DONE
                    </button>
                </div>
            </div>
        );
    }

    const payOptions = [
        { id: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" />, color: 'emerald' },
        { id: 'transfer', label: 'Transfer', icon: <Landmark className="w-5 h-5" />, color: 'purple' },
        { id: 'pos', label: 'POS', icon: <CreditCard className="w-5 h-5" />, color: 'blue' },
        { id: 'bill_to_room', label: 'Room Bill', icon: <Smartphone className="w-5 h-5" />, color: 'amber' },
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-white selection:bg-blue-500/30 font-inter">
            <div className="max-w-md mx-auto min-h-screen flex flex-col p-6">

                {/* Header Lock */}
                <div className="flex justify-center mb-8 mt-12">
                    <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Verification Lockdown</span>
                    </div>
                </div>

                <h1 className="text-3xl font-black text-center mb-10 tracking-tight">Confirm Payment</h1>

                <div className="bg-[#111827] rounded-[40px] p-8 border border-white/5 shadow-2xl mb-8">
                    <div className="text-center space-y-2 mb-8 pb-8 border-b border-white/5">
                        <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">Expected Amount</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white">
                            <span className="text-2xl text-slate-600 mr-2">₦</span>
                            {safeNumber(order?.total)}
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                {payOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSelectedPayment(opt.id)}
                                        className={`
                                            p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300
                                            ${selectedPayment === opt.id
                                                ? 'bg-blue-600 border-white/20 shadow-lg shadow-blue-900/20'
                                                : 'bg-[#1f2937] border-transparent hover:bg-[#374151]'}
                                        `}
                                    >
                                        <div className={`${selectedPayment === opt.id ? 'text-white' : 'text-slate-400'}`}>
                                            {opt.icon}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedPayment === 'pos' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">POS Receipt ID</label>
                                <input
                                    type="text"
                                    value={receiptId}
                                    onChange={(e) => setReceiptId(e.target.value)}
                                    placeholder="Enter receipt or reference"
                                    className="w-full bg-[#1f2937] border border-white/5 p-5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center tracking-widest"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={processing || !selectedPayment}
                    className={`
                        w-full py-6 rounded-[32px] font-black text-xl tracking-widest transition-all shadow-2xl active:scale-[0.98] mt-auto
                        ${processing || !selectedPayment
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}
                    `}
                >
                    {processing ? (
                        <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>VERIFYING...</span>
                        </div>
                    ) : (
                        'FINALIZE PAYMENT'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ConfirmPayment;
