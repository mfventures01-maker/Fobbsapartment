
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useShift } from '@/hooks/useShift';

// --- Types ---
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
    const { user } = useAuth();
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

            console.log("Fetching order:", orderId);
            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .single();

            if (orderError) throw new Error("Order not found");
            if (!orderData) throw new Error("Order does not exist");

            setOrder(orderData);

            if (orderData.status !== 'open') throw new Error("Order already processed");

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
                // Fallback to legacy field if present but no intent table entry yet
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

        // Shift Check
        if (!currentShift) {
            setError("No active shift found. Please start a shift first.");
            return;
        }

        // Final Client-Side Checks
        if (!selectedPayment) {
            setError("Please select a payment method");
            return;
        }
        if (selectedPayment === 'pos' && !receiptId.trim()) {
            setError("POS Receipt ID is required");
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            if (!supabase) throw new Error('System offline');

            let finalIntentId = intentId;

            // If no intent exists, create one now (JIT Intent)
            if (!finalIntentId) {
                const { data: newIntent, error: createError } = await supabase
                    .from('payment_intents')
                    .insert({
                        order_id: order.id,
                        business_id: order.org_id,
                        branch_id: order.location_id,
                        staff_id: user.id,
                        shift_id: currentShift.id,
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

            // ATOMIC SETTLEMENT via RPC
            const { data: result, error: rpcError } = await supabase.rpc('confirm_payment_intent', {
                p_intent_id: finalIntentId,
                p_external_reference: receiptId || null
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                throw new Error(rpcError.message || "Payment confirmation failed at settlement layer");
            }

            // Success
            setSuccess(true);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Payment confirmation failed");
        } finally {
            setProcessing(false);
        }
    };

    // --- UI RENDER ---


    if (!user) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.header}>Staff Access Required</h1>
                    <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                        You must be logged in to confirm payments.
                    </p>
                    <button
                        onClick={() => navigate('/staff-login')}
                        style={styles.confirmButton}
                    >
                        Go to Staff Login
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loader}>Loading Order...</div>
            </div>
        );
    }

    if (error && !order) {
        // Fatal error loading order
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Success State
    if (success) {
        return (
            <div style={styles.container}>
                <div style={styles.successBox}>
                    <div style={styles.icon}>✓</div>
                    <h2>Payment Confirmed</h2>
                    <p>Transaction ID recorded.</p>
                    <p>Order #{order?.id.slice(0, 8)} is now PAID.</p>
                </div>
            </div>
        );
    }

    // Main Confirmation Interface
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.header}>Confirm Payment</h1>

                {/* Order ID */}
                <div style={styles.row}>
                    <span style={styles.label}>Order ID:</span>
                    <span style={styles.value}>{order?.id.slice(0, 8)}...</span>
                </div>

                {/* Amount */}
                <div style={styles.amountBox}>
                    <span style={styles.currency}>₦</span>
                    {order?.total?.toLocaleString()}
                </div>

                {/* Payment Method Selection */}
                <div style={styles.section}>
                    <label style={styles.sectionLabel}>Payment Method</label>
                    <div style={styles.grid}>
                        {['cash', 'transfer', 'pos', 'bill_to_room'].map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedPayment(type)}
                                disabled={processing}
                                style={{
                                    ...styles.optionButton,
                                    backgroundColor: selectedPayment === type ? '#16a34a' : '#1f2937',
                                    border: selectedPayment === type ? '2px solid #ffffff' : '1px solid #374151'
                                }}
                            >
                                {type.replace(/_/g, ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* POS Receipt Input */}
                {selectedPayment === 'pos' && (
                    <div style={styles.section}>
                        <label style={styles.sectionLabel}>POS Receipt ID <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={receiptId}
                            onChange={(e) => setReceiptId(e.target.value)}
                            placeholder="Enter receipt number"
                            disabled={processing}
                            style={styles.input}
                        />
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div style={styles.errorInline}>
                        {error}
                    </div>
                )}

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={processing || !selectedPayment}
                    style={{
                        ...styles.confirmButton,
                        opacity: (processing || !selectedPayment) ? 0.5 : 1,
                        cursor: (processing || !selectedPayment) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {processing ? 'Processing...' : 'CONFIRM PAYMENT'}
                </button>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        marginTop: '20px'
    },
    header: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '24px',
        textAlign: 'center'
    },
    loader: {
        marginTop: '100px',
        fontSize: '1.2rem'
    },
    errorBox: {
        backgroundColor: '#ef4444',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        marginTop: '50px'
    },
    successBox: {
        backgroundColor: '#1f2937',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        marginTop: '50px',
        border: '1px solid #16a34a'
    },
    icon: {
        fontSize: '48px',
        color: '#16a34a',
        marginBottom: '16px'
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        color: '#9ca3af'
    },
    label: {
        fontSize: '0.9rem'
    },
    value: {
        fontFamily: 'monospace'
    },
    amountBox: {
        backgroundColor: '#1f2937',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '32px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px'
    },
    currency: {
        fontSize: '1.5rem',
        color: '#9ca3af',
        marginTop: '8px'
    },
    section: {
        marginBottom: '24px'
    },
    sectionLabel: {
        display: 'block',
        fontSize: '0.9rem',
        marginBottom: '10px',
        color: '#d1d5db',
        fontWeight: '500'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px'
    },
    optionButton: {
        padding: '16px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    input: {
        width: '100%',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        color: 'white',
        fontSize: '1rem',
        boxSizing: 'border-box' // Fix padding width issue
    },
    confirmButton: {
        width: '100%',
        padding: '18px',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        marginTop: '10px',
        transition: 'background-color 0.2s'
    },
    errorInline: {
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: '16px',
        padding: '10px',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px'
    }
};

export default ConfirmPayment;
