import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { CreditCard, Banknote, Smartphone, CheckCircle, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { safeNumber } from '@/lib/safeNumber';

const PaymentIntent: React.FC = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id') || searchParams.get('orderId');
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const paymentOptions = [
        { id: 'pos', label: 'POS Terminal', icon: <CreditCard className="w-6 h-6" />, color: 'bg-blue-600', description: 'Pay via debit card' },
        { id: 'cash', label: 'Cash Payment', icon: <Banknote className="w-6 h-6" />, color: 'bg-emerald-600', description: 'Pay with physical cash' },
        { id: 'transfer', label: 'Bank Transfer', icon: <Smartphone className="w-6 h-6" />, color: 'bg-purple-600', description: 'Direct bank transfer' },
    ];

    useEffect(() => {
        if (!orderId) {
            setError('Missing Order ID');
            setInitialLoading(false);
            return;
        }

        const fetchOrder = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("id", orderId)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Order not found");

                if (data.status === 'paid') {
                    setSuccess(true);
                    setOrder(data);
                    return;
                }

                if (data.status !== 'open') {
                    throw new Error("Order already processed");
                }

                setOrder(data);
            } catch (err: any) {
                console.error("Error fetching order:", err);
                setError(err.message || "Failed to load order details");
            } finally {
                setInitialLoading(false);
            }
        };

        fetchOrder();

        // Subscribe to order updates (Realtime)
        const channel = supabase
            .channel(`order-${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
                if (payload.new.status === 'paid') {
                    setSuccess(true);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    const handleSelect = (id: string) => {
        if (success || loading) return;
        setPaymentMethod(id);
        setError(null);
    };

    const handleConfirm = async () => {
        if (!paymentMethod || !orderId || !order || loading) return;

        setLoading(true);
        setError(null);

        try {
            if (!supabase) throw new Error('System offline');

            const { error: intentError } = await supabase
                .from('payment_intents')
                .insert({
                    order_id: orderId,
                    org_id: order.org_id,
                    branch_id: order.location_id,
                    expected_amount: order.total,
                    payment_type: paymentMethod,
                    status: 'pending'
                });

            if (intentError) throw intentError;

            // Optional: Update order with chosen method for staff visibility
            await supabase.from('orders').update({ payment_method: paymentMethod }).eq('id', orderId);

            setSuccess(true);
        } catch (err: any) {
            console.error('Process failed:', err);
            setError(err.message || 'Failed to save payment method');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Securing connection...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-sm w-full">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Order Error</h2>
                    <p className="text-slate-400 mb-8">{error || "This order could not be validated."}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-bold transition-all"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const tableNumber = order.metadata?.table_number || "N/A";

    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30 font-inter">
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative px-6 py-12">

                <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Secure Checkout (Ref: {(orderId || 'N/A').slice(0, 8)})</span>
                </div>

                {/* Header */}
                <div className="text-center space-y-2 mb-10">
                    <h1 className="text-4xl font-black tracking-tight">
                        ₦{safeNumber(order.total)}
                    </h1>
                    <p className="text-slate-400 font-medium tracking-wide uppercase text-xs">
                        {tableNumber !== "N/A" ? `Table ${tableNumber}` : `Order #${(orderId || 'N/A').slice(0, 8)}`}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {success ? (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-10 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <CheckCircle className="w-24 h-24 text-emerald-500" />
                                </div>
                                <div className="bg-emerald-500 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/40 rotate-12">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-black mb-3">Intent Locked</h2>
                                <p className="text-emerald-100/70 font-medium mb-8">Please inform the staff that you are ready to pay via <span className="text-white font-bold">{paymentMethod?.toUpperCase()}</span>.</p>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4 text-left">
                                    <Clock className="w-6 h-6 text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-400 uppercase">Status</p>
                                        <p className="text-sm font-medium">Awaiting Staff Verification</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-slate-500 text-sm italic py-4">
                                This page will automatically update once payment is confirmed.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Select Payment Method</label>
                                <div className="grid gap-3">
                                    {paymentOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleSelect(option.id)}
                                            disabled={loading}
                                            className={`
                                                relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 group
                                                ${paymentMethod === option.id
                                                    ? `border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]`
                                                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    p-3 rounded-xl transition-all duration-300
                                                    ${paymentMethod === option.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}
                                                `}>
                                                    {option.icon}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-lg ${paymentMethod === option.id ? 'text-white' : 'text-slate-300'}`}>
                                                        {option.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">{option.description}</p>
                                                </div>
                                            </div>
                                            {paymentMethod === option.id && (
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] animate-pulse" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={!paymentMethod || loading}
                                className={`
                                    w-full py-5 rounded-2xl font-black text-lg tracking-wider transition-all duration-300 shadow-2xl active:scale-[0.98]
                                    ${!paymentMethod || loading
                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'}
                                `}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>INITIATING...</span>
                                    </div>
                                ) : (
                                    'CONFIRM INTENT'
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Decor */}
                <div className="mt-auto pt-12 text-center">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
                        Powered by CARSS Fintech
                    </p>
                </div>
            </div>
        </div>
    );
};

// Simple Loader component for internal use
const Loader2 = ({ className }: { className?: string }) => (
    <div className={`w-5 h-5 border-2 border-white/30 border-t-white rounded-full ${className}`}></div>
);

export default PaymentIntent;
