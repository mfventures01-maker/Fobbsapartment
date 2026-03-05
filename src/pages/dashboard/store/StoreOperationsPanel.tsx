import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import {
    Activity, Layout, ShoppingBag,
    Users, Package, Clock,
    MapPin, RefreshCw, Zap
} from 'lucide-react';

const StoreOperationsPanel: React.FC = () => {
    const { authority } = useAuth();
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        staff: 0,
        lowStock: 0
    });
    const [loading, setLoading] = useState(true);

    const hydrate = useCallback(async () => {
        if (!authority.branchId) return;
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Revenue
            const { data: tx } = await supabase.from('transactions')
                .select('amount')
                .eq('branch_id', authority.branchId)
                .gte('created_at', today);

            // 2. Orders
            const { data: ord } = await supabase.from('orders')
                .select('id')
                .eq('location_id', authority.branchId)
                .gte('created_at', today);

            // 3. Active Staff (shifts)
            const { data: shifts } = await supabase.from('shifts')
                .select('id')
                .eq('branch_id', authority.branchId)
                .eq('status', 'open');

            // 4. Low Stock
            const { data: inv } = await supabase.from('inventory')
                .select('id')
                .eq('branch_id', authority.branchId)
                .filter('current_stock', 'lt', 'min_stock');

            setStats({
                revenue: tx?.reduce((acc, t) => acc + Number(t.amount), 0) || 0,
                orders: ord?.length || 0,
                staff: shifts?.length || 0,
                lowStock: inv?.length || 0
            });
        } catch (err) {
            console.error('[STORE PANEL] Hydrate error:', err);
        } finally {
            setLoading(false);
        }
    }, [authority.branchId]);

    useEffect(() => {
        hydrate();
        const channel = supabase.channel(`store-ops-${authority.branchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `branch_id=eq.${authority.branchId}` }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `location_id=eq.${authority.branchId}` }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `branch_id=eq.${authority.branchId}` }, () => hydrate())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [authority.branchId, hydrate]);

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-2xl">
                        <Layout className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Store Operations Panel</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch-Level Command</p>
                    </div>
                </div>
                <button onClick={hydrate} className="p-3 hover:bg-white rounded-2xl border border-slate-200 transition-all bg-slate-50 shadow-sm">
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
                        <Zap className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
                    <h3 className="text-2xl font-black text-slate-900">₦{stats.revenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                    <h3 className="text-2xl font-black text-slate-900">{stats.orders}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit mb-4">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Staff</p>
                    <h3 className="text-2xl font-black text-slate-900">{stats.staff}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4">
                        <Package className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Low Stock Items</p>
                    <h3 className="text-2xl font-black text-slate-900">{stats.lowStock}</h3>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center space-y-4">
                <MapPin className="w-12 h-12 text-slate-200 mx-auto" />
                <h2 className="text-lg font-bold text-slate-800">Operational Continuity Active</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">This panel is wired to live branch telemetry. All transactions and stock deductions are synchronized in real-time.</p>
            </div>
        </div>
    );
};

export default StoreOperationsPanel;
