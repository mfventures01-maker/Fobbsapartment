import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

// Removed strict Auth/Shift hooks for Guest/Public Flow
import { CreditCard, Banknote, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';

const PaymentIntent: React.FC = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id') || searchParams.get('orderId'); // Handle both params
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const paymentOptions = [
        { id: 'pos', label: 'POS Terminal', icon: <CreditCard className="w-6 h-6" />, color: 'bg-blue-600' },
        { id: 'cash', label: 'Cash Payment', icon: <Banknote className="w-6 h-6" />, color: 'bg-emerald-600' },
        { id: 'transfer', label: 'Bank Transfer', icon: <Smartphone className="w-6 h-6" />, color: 'bg-purple-600' },
        // removed 'bill to room' if no guest profile, but keeping it simple for now
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
                // Fetch all columns to check formetadata or table info
                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("id", orderId)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Order not found");

                // Validate Order
                if (data.status !== 'open' && data.status !== 'pending') {
                    throw new Error("Order is not open for payment");
                }

                setOrder(data);

                // Pre-select payment method if set during checkout
                if (data.payment_method) {
                    setPaymentMethod(data.payment_method);
                }

            } catch (err: any) {
                console.error("Error fetching order:", err);
                setError(err.message || "Failed to load order details");
            } finally {
                setInitialLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const handleSelect = (id: string) => {
        if (success || loading) return;
        setPaymentMethod(id);
        setError(null);
    };

    const handleConfirm = async () => {
        // Validation: Check inputs
        if (!paymentMethod) {
            setError('Please select a payment method');
            return;
        }

        if (!orderId || !order) {
            setError('Invalid Order');
            return;
        }

        if (order.status !== 'open' && order.status !== 'pending') {
            setError("Order already processed");
            return;
        }

        // Prevent race conditions
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            if (!supabase) throw new Error('Supabase client not initialized');

            // Insert Payment Intent
            // Note: staff_id and shift_id are now optional/null for guest flow
            const { error: intentError } = await supabase
                .from('payment_intents')
                .insert({
                    order_id: orderId,
                    org_id: order.org_id,
                    branch_id: order.location_id,
                    // staff_id: null, // Public flow
                    // shift_id: null, // Public flow
                    expected_amount: order.total_amount || order.total,
                    payment_type: paymentMethod,
                    status: 'pending' // Pending confirmation/webhook
                });

            if (intentError) throw intentError;

            // Updated Order Status -> 'processing' or stick to 'open'? 
            // Usually Payment Intent pending means we wait.
            // But let's set metadata.
            await supabase.from('orders').update({ payment_intent: paymentMethod }).eq('id', orderId);

            setSuccess(true);
        } catch (err: any) {
            console.error('Process failed:', err);
            setError(err.message || 'Failed to save payment method');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading order...</div>;
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
                <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl text-center max-w-sm animate-in zoom-in duration-300">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
                    <p className="text-gray-300 mb-6">{error || "The requested order could not be validated."}</p>
                    <button
                        onClick={() => window.location.href = '/'} // Redirect to home/landing instead of POS
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // Determine Table Number display
    const tableNumber = order.metadata?.table_number ||
        (order.customer_name?.toLowerCase().includes('table') ? order.customer_name : null) ||
        "N/A";

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`;

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-emerald-500/30">
            <div className="max-w-md mx-auto min-h-screen bg-slate-900 sm:bg-slate-800/50 sm:shadow-2xl flex flex-col">

                {/* Header Section */}
                <div className="p-6 text-center space-y-4 pt-12">
                    <div className="inline-block px-4 py-1.5 bg-slate-700/50 rounded-full border border-slate-600 text-sm font-medium text-slate-300">
                        Order #{orderId?.slice(0, 8)}
                    </div>

                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Table {tableNumber !== "N/A" ? tableNumber.replace(/table/i, '').trim() : "--"}
                    </h1>

                    <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mx-auto">
                        <img
                            src={qrUrl}
                            alt="Order QR Code"
                            className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                        />
                    </div>

                    <p className="text-slate-400 text-sm">Scan to view order details</p>
                </div>

                {/* Content Section */}
                <div className="flex-1 px-6 pb-8">
                    <div className="space-y-6">
                        {success ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                                <div className="bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Payment Recorded</h2>
                                <p className="text-emerald-200/80 mb-6">Proceed with {paymentMethod ? paymentMethod.toUpperCase() : 'payment'} collection.</p>
                                {/* Removed 'New Transaction' button as it's not a POS kiosk per se */}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                        Payment Method {order.payment_method ? '(Pre-selected)' : ''}
                                    </h3>

                                    <div className="grid grid-cols-1 gap-3">
                                        {paymentOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                // Only allow change if not already set, or distinct override needed?
                                                // Let's allow change for flexibility, BUT highlight current selection.
                                                onClick={() => handleSelect(option.id)}
                                                disabled={loading}
                                                className={`
                                                    relative group p-4 rounded-xl border flex items-center space-x-4 transition-all duration-200
                                                    ${paymentMethod === option.id
                                                        ? `${option.color} border-transparent shadow-lg scale-[1.02] ring-2 ring-white/20`
                                                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'}
                                                `}
                                            >
                                                <div className={`
                                                    p-3 rounded-lg transition-colors
                                                    ${paymentMethod === option.id ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-slate-600'}
                                                `}>
                                                    {option.icon}
                                                </div>
                                                <span className="font-semibold text-lg">{option.label}</span>
                                                {paymentMethod === option.id && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <div className="w-3 h-3 bg-white rounded-full shadow-lg animate-pulse" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-left">
                                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-400 text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleConfirm}
                                    disabled={!paymentMethod || loading}
                                    className={`
                                        w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95
                                        ${!paymentMethod || loading
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'}
                                    `}
                                >
                                    {loading ? 'Processing...' : 'Confirm Intent'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentIntent;
