
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
    id: string;
    total: number;
    payment_intent: string;
    status: 'open' | 'paid' | 'void' | 'refunded';
    served_at: string | null;
    created_at: string;
    location_id: string;
    org_id: string;
}

const Fulfillment: React.FC = () => {
    const { user } = useAuth();
    const [readyOrders, setReadyOrders] = useState<Order[]>([]);
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Initial Load & Realtime Subscription
    useEffect(() => {
        if (!user) return;
        fetchOrders();

        if (!supabase) return;
        const channel = supabase
            .channel('fulfillment-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchOrders(); // Refresh on any change for simplicity/accuracy
                }
            )
            .subscribe();



        return () => {
            if (supabase) {
                supabase.removeChannel(channel);
            }
        };
    }, [user]);

    const fetchOrders = async () => {
        if (!supabase) return;

        try {
            // Fetch Ready Orders (Paid but NOT served)
            const { data: readyData, error: readyError } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'paid')
                .is('served_at', null)
                .order('created_at', { ascending: true });

            if (readyError) throw readyError;

            // Fetch Recently Completed (Paid AND Served)
            const { data: completedData, error: completedError } = await supabase
                .from('orders')
                .select('*')
                .not('served_at', 'is', null) // served_at IS NOT NULL
                .order('served_at', { ascending: false })
                .limit(10); // Show last 10 served

            if (completedError) throw completedError;

            setReadyOrders(readyData || []);
            setCompletedOrders(completedData || []);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to sync orders');
        } finally {
            setLoading(false);
        }
    };

    const handleServe = async (orderId: string) => {
        if (processingId) return;
        setProcessingId(orderId);

        if (!supabase) return;

        try {
            // STEP 2: ATOMIC SERVE ACTION
            // Enforce: status='paid' AND served_at IS NULL
            const { data, error } = await supabase
                .from("orders")
                .update({ served_at: new Date().toISOString() })
                .eq("id", orderId)
                .eq("status", "paid")
                .is("served_at", null)
                .select();

            if (error) throw error;

            // STEP 3: VALIDATION
            if (!data || data.length === 0) {
                // Determine why it failed (simulated diagnosis)
                // In production, we assume race condition or invalid state
                throw new Error("Order cannot be served. It may be unpaid or already served.");
            }

            // STEP 4: SUCCESS
            toast.success("Order Served");
            // State updates handled by realtime subscription, but optimistic update is good UX
            setReadyOrders(prev => prev.filter(o => o.id !== orderId));

        } catch (err: any) {
            console.error("Serve failed:", err);
            toast.error(err.message || "Failed to serve order");
        } finally {
            setProcessingId(null);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <p>Staff Access Required</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-inter">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="text-emerald-500" />
                            Fulfillment Lock
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Leakage Prevention System Active</p>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </header>

                {/* SECTION 1: READY TO SERVE */}
                <section className="mb-12">
                    <h2 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        READY TO SERVE ({readyOrders.length})
                    </h2>

                    {readyOrders.length === 0 ? (
                        <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500 border border-slate-700 border-dashed">
                            No paid orders pending service.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {readyOrders.map(order => (
                                <div key={order.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg hover:border-emerald-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-mono text-slate-500">#{order.id.slice(0, 8)}</span>
                                            <div className="text-2xl font-bold text-white mt-1">
                                                ₦{order.total.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-medium border border-emerald-500/20">
                                            PAID
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-400 mb-6">
                                        <div className="flex justify-between">
                                            <span>Method:</span>
                                            <span className="text-slate-200 capitalize">{order.payment_intent?.replace('_', ' ') || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Time:</span>
                                            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleServe(order.id)}
                                        disabled={processingId === order.id}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                                    >
                                        {processingId === order.id ? 'Verifying...' : 'MARK AS SERVED'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* SECTION 2: COMPLETED */}
                <section>
                    <h2 className="text-lg font-semibold mb-4 text-slate-400">Recently Served</h2>
                    <div className="space-y-2">
                        {completedOrders.map(order => (
                            <div key={order.id} className="bg-slate-800/30 rounded-lg p-4 flex justify-between items-center border border-slate-800 text-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                    <span className="font-mono text-slate-500">#{order.id.slice(0, 8)}</span>
                                    <span className="text-slate-300">₦{order.total.toLocaleString()}</span>
                                </div>
                                <div className="text-slate-500 flex items-center gap-2">
                                    <span>Served {new Date(order.served_at!).toLocaleTimeString()}</span>
                                    <CheckCircle className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                        ))}
                        {completedOrders.length === 0 && (
                            <p className="text-slate-600 text-sm italic">No recent history.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Fulfillment;
