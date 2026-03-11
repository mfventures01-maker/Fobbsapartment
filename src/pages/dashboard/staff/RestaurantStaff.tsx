import React, { useEffect, useState } from 'react';
import { Utensils, DollarSign, Bell, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { safeNumber } from '@/lib/safeNumber';

interface Order {
    id: string;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
    metadata: any;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const RestaurantStaff: React.FC = () => {
    const { orgId } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        if (!orgId || !supabase) return;
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error("Fetch orders failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        if (!orgId || !supabase) return;

        const channel = supabase
            .channel('restaurant-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `org_id=eq.${orgId}` }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId]);

    const activeOrders = orders.filter(o => o.status === 'open' || o.status === 'pending');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Utensils className="w-6 h-6 text-orange-600" />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-emerald-950">Restaurant Dashboard</h1>
                </div>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">Kitchen & Service View</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Active Orders"
                    value={activeOrders.length.toString()}
                    icon={<Utensils className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="Revenue Today"
                    value={`₦${safeNumber(orders.reduce((acc, o) => acc + (o.status === 'paid' ? o.total : 0), 0))}`}
                    icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="Total Orders"
                    value={orders.length.toString()}
                    icon={<Bell className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-gray-800 uppercase tracking-tight text-sm">Kitchen Feed</h3>
                    </div>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>

                <div className="divide-y divide-gray-50">
                    {orders.length === 0 && !loading && (
                        <div className="p-12 text-center text-gray-400 font-medium italic">
                            No orders found.
                        </div>
                    )}
                    {orders.map(order => (
                        <div key={order.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-10 rounded-full ${order.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <div>
                                    <div className="font-bold text-gray-900">
                                        {order.metadata?.delivery_method === 'Room Delivery' ? `Room ${order.metadata.room_number}` : (order.metadata?.table_number ? `Table ${order.metadata.table_number}` : order.customer_name || 'Guest')}
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                                        <span>₦{safeNumber(order.total)}</span>
                                        <span>•</span>
                                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {order.status}
                                </span>
                                <button
                                    onClick={() => navigate(`/confirm-payment?order_id=${order.id}`)}
                                    className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RestaurantStaff;
