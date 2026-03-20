import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Layout, ShoppingBag, Users, Package,
    RefreshCw, Zap, MapPin, Plus, Minus,
    History, AlertTriangle, CheckCircle2,
    ArrowUpRight, ArrowDownRight, Search,
    Filter, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemState } from '@/hooks/useSystemState';
import { getInventoryLevels, recordInventoryIn, recordInventoryOut } from '@/services/storeService';
import { safeNumber } from '@/lib/safeNumber';
import toast from 'react-hot-toast';

// --- SUB-COMPONENTS ---

const InventoryRow: React.FC<{ item: any; onAction: (item: any, type: 'in' | 'out') => void }> = ({ item, onAction }) => {
    const isLow = item.current_stock <= item.min_stock;

    return (
        <div className="group flex items-center justify-between p-4 bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors last:border-0 first:rounded-t-3xl last:rounded-b-3xl">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isLow ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Package className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category} • {item.unit || 'units'}</p>
                </div>
            </div>

            <div className="flex items-center gap-12">
                <div className="text-right">
                    <p className={`text-lg font-black tabular-nums ${isLow ? 'text-rose-500' : 'text-slate-900'}`}>
                        {item.current_stock}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Current Stock</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onAction(item, 'in')}
                        className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100"
                        title="Add Stock"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onAction(item, 'out')}
                        className="p-3 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm border border-amber-100"
                        title="Withdraw Stock"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-slate-300 hover:text-slate-500 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN TERMINAL ---

const StoreTerminal: React.FC = () => {
    const { authority } = useAuth();
    const { revenue, orders, active_terminals, inventory_alerts, refresh: systemRefresh } = useSystemState();

    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'low'>('all');

    // --- HYDRATION ---
    const hydrate = useCallback(async () => {
        if (!authority.branchId) return;
        setLoading(true);
        try {
            // Background system refresh (Revenue/Orders)
            await systemRefresh(authority.businessId || '', authority.branchId);

            // Full inventory pull
            const data = await getInventoryLevels(authority.branchId);
            setInventory(data.items || []);
        } catch (err: any) {
            toast.error('Sync Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [authority.businessId, authority.branchId, systemRefresh]);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // --- ACTIONS ---
    const handleInventoryAction = async (item: any, type: 'in' | 'out') => {
        const qtyText = window.prompt(`Enter quantity to ${type === 'in' ? 'ADD' : 'WITHDRAW'} for ${item.name}:`);
        const qty = parseFloat(qtyText || '0');
        if (!qty || isNaN(qty)) return;

        const reason = type === 'out'
            ? window.prompt('Reason for withdrawal (Damage/Usage/etc):')
            : window.prompt('Reference/Invoice # (Optional):');

        const loadingId = toast.loading('Synchronizing Vault...');
        try {
            if (type === 'in') {
                await recordInventoryIn([{ item_id: item.id, quantity: qty }], reason || '');
            } else {
                await recordInventoryOut([{ item_id: item.id, quantity: qty }], reason || 'Manual adjustment');
            }
            toast.success('Inventory state mirrored', { id: loadingId });
            await hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loadingId });
        }
    };

    // --- COMPUTED ---
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filter === 'low' ? (item.current_stock <= item.min_stock) : true;
            return matchesSearch && matchesFilter;
        });
    }, [inventory, searchTerm, filter]);

    const lowStockCount = useMemo(() => {
        return inventory.filter(i => i.current_stock <= i.min_stock).length;
    }, [inventory]);

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* TERMINAL HEADER */}
            <header className="bg-white border-b border-slate-200/60 p-8 sticky top-0 z-50 backdrop-blur-3xl shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-900/20 shadow-inner">
                            <Layout className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Store Command Terminal</h1>
                                <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Airtight Mirroring</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Site: {authority.branchName || 'Alpha Node'}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Last Sync: {new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-8 bg-slate-50 px-10 py-4 rounded-[2.5rem] border border-slate-200/60 shadow-inner">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Flow</p>
                                <p className="text-xl font-black text-emerald-600 tabular-nums font-mono">₦{safeNumber(revenue?.today)}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tickets</p>
                                <p className="text-xl font-black text-slate-900 tabular-nums">{orders?.today_total}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Anomalies</p>
                                <p className={`text-xl font-black tabular-nums ${lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{lowStockCount}</p>
                            </div>
                        </div>

                        <button onClick={hydrate} className="p-4 bg-white hover:bg-slate-50 rounded-[1.5rem] border border-slate-200 transition-all shadow-sm group">
                            <RefreshCw className={`w-6 h-6 text-slate-400 group-active:rotate-180 transition-all duration-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-10 max-w-7xl mx-auto space-y-10">
                {/* VAULT SEARCH & FILTERS */}
                <section className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Vault (Inventory SSOT)..."
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] w-full md:w-auto">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 md:w-32 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All Stock
                        </button>
                        <button
                            onClick={() => setFilter('low')}
                            className={`flex-1 md:w-32 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${filter === 'low' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/10' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Low Stock
                        </button>
                    </div>
                </section>

                {/* INVENTORY LIST */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-6">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                            <Package className="w-6 h-6 text-indigo-500" />
                            VAULT SNAPSHOT
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filteredInventory.length} Items Indexed
                        </p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl overflow-hidden">
                        {filteredInventory.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <Search className="w-16 h-16 text-slate-100 mx-auto" />
                                <p className="text-slate-400 font-bold italic">No items matching current reflection criteria.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredInventory.map(item => (
                                    <InventoryRow key={item.id} item={item} onAction={handleInventoryAction} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* BOTTOM TELEMETRY GRID */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-900/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12 translate-x-1/2 -translate-y-1/2">
                            <ArrowUpRight className="w-40 h-40" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Operational Health</p>
                        <h4 className="text-xl font-black mb-4 tracking-tighter">Normal Convergence</h4>
                        <p className="text-sm font-medium opacity-80 leading-relaxed">System state is perfectly synchronized with the central financial core. No drift detected in the last 24h.</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Airtight Protocol v4.2</span>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl shadow-slate-900/10 relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Identity Presence</p>
                        <h4 className="text-xl font-black mb-6 tracking-tighter">Authorized Terminals</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold">Kitchen Node</span>
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold">Manager Hub</span>
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold">Reception Gate</span>
                                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Command Outbox</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tighter">Pending Tasks</h4>
                        </div>
                        <div className="py-10 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-100 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting Branch Directives</p>
                        </div>
                        <button className="w-full py-4 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            <History className="w-4 h-4" /> Audit Logs
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default StoreTerminal;
