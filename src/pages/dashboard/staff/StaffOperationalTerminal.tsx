import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabaseClient';
import {
    Zap, ShoppingCart, Package,
    Activity, ArrowRight,
    Plus, Minus, Search,
    Clock, Banknote, Smartphone, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Order, InventoryItem, Transaction, PaymentIntent } from '@/types/db';
import ShiftSettlementPanel from '@/components/ShiftSettlementPanel';
import { SHIFT_STATUS } from '../../../constants/shiftStatus';

// --- TYPES ---
interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    availableStock: number;
}

const StaffOperationalTerminal: React.FC = () => {
    const { user, authority } = useAuth();
    const { shiftState, startShift, endShift, refreshShift } = useShiftState();

    // --- STATE ---
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
    const [activeIntent, setActiveIntent] = useState<PaymentIntent | null>(null);

    const [customerName, setCustomerName] = useState('');
    const [tableRef, setTableRef] = useState('');

    const initialFetchDone = useRef(false);

    // --- HYDRATION ---
    const hydrate = useCallback(async () => {
        if (!authority.businessId) return;

        try {
            // 2. Fetch Recent Transactions
            const { data: txData } = await supabase
                .from('transactions')
                .select('*')
                .eq('business_id', authority.businessId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (txData) setTransactions(txData);

            // 3. Fetch Inventory (Live Menu Source)
            const { data: invData } = await supabase
                .from('inventory')
                .select('*')
                .eq('business_id', authority.businessId);

            if (invData) setInventory(invData || []);

        } catch (err) {
            console.error('[TERMINAL] Hydrate error:', err);
        }
    }, [authority.businessId]);

    useEffect(() => {
        if (authority.businessId && !initialFetchDone.current) {
            hydrate();
            initialFetchDone.current = true;
        }

        // --- REALTIME TELEMETRY ---
        const channel = supabase.channel('operational-terminal-telemetry')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_intents' }, () => hydrate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                refreshShift();
                hydrate();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [authority.businessId, hydrate, refreshShift]);

    // --- CART LOGIC WITH INVENTORY GUARD ---
    const addToCart = (item: InventoryItem) => {
        const existing = cart.find(i => i.id === item.id);
        const currentQty = existing ? existing.quantity : 0;

        if (currentQty + 1 > item.current_stock) {
            toast.error(`Insufficient Stock for ${item.name}`);
            return;
        }

        setCart(prev => {
            if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, {
                id: item.id,
                name: item.name,
                price: Number(item.sale_price),
                quantity: 1,
                category: 'Internal',
                availableStock: item.current_stock
            }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => {
            const item = prev.find(i => i.id === id);
            if (!item) return prev;

            if (delta > 0 && item.quantity + delta > item.availableStock) {
                toast.error(`Max Stock Reached: ${item.availableStock}`);
                return prev;
            }

            return prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
        });
    };

    const total = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    // --- ACTIONS ---
    const handleCreateOrder = async () => {
        if (!user || cart.length === 0 || shiftState.status !== SHIFT_STATUS.OPEN) return;

        const loading = toast.loading('Creating High-Integrity Order...');
        try {
            // 1. Create Order
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    org_id: authority.businessId,
                    location_id: authority.branchId,
                    staff_id: user.id,
                    customer_name: customerName || 'Walk-in',
                    table_reference: tableRef || 'Counter',
                    total_amount: total,
                    status: 'open'
                })
                .select()
                .single();

            if (orderErr) throw orderErr;

            // 2. Create Order Items
            const items = cart.map(i => ({
                order_id: order.id,
                org_id: authority.businessId,
                name: i.name,
                qty: i.quantity,
                price: i.price,
                subtotal: i.price * i.quantity
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(items);
            if (itemsErr) throw itemsErr;

            toast.success('Order Created Successfully', { id: loading });
            setCheckoutOrder(order); // Added to trigger checkout modal
            setCart([]);
            setCustomerName('');
            setTableRef('');
            hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    const createIntent = async (order: Order, type: string) => {
        const loading = toast.loading(`Creating ${type} Intent...`);
        try {
            const { data: intent, error } = await supabase
                .from('payment_intents')
                .insert({
                    order_id: order.id,
                    org_id: authority.businessId,
                    branch_id: authority.branchId,
                    staff_id: user?.id,
                    shift_id: shiftState.status === SHIFT_STATUS.OPEN ? shiftState.shift.id : null,
                    expected_amount: order.total_amount,
                    payment_type: type,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            setActiveIntent(intent);
            setCheckoutOrder(null);
            toast.success('Intent Created', { id: loading });
            hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    const confirmPayment = async (ref: string = '') => {
        if (!activeIntent) return;
        const loading = toast.loading('Confirming Settlement...');
        try {
            const { data, error } = await (supabase as any).rpc('confirm_payment_intent', {
                p_intent_id: activeIntent.id,
                p_external_reference: ref
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Settlement failed');

            toast.success('Transaction Verified', { id: loading });
            setActiveIntent(null);
            hydrate();
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    // --- RENDER HELPERS ---
    const menuItems = useMemo(() => {
        return inventory.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [inventory, searchQuery]);

    const shiftRevenue = transactions
        .filter(tx => tx.shift_id === (shiftState.status === SHIFT_STATUS.OPEN ? (shiftState as any).shift?.id : ''))
        .reduce((acc, tx) => acc + Number(tx.amount), 0);

    return (
        <div className="min-h-screen bg-slate-50 space-y-4 pb-20">
            {/* Top Authority Bar */}
            <header className="bg-emerald-900 border-b border-emerald-800 p-4 sticky top-0 z-30 shadow-xl">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white/10 rounded-2xl">
                            <Zap className="w-5 h-5 text-emerald-400 fill-current" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                {authority.departmentName || 'Operations'} Terminal
                            </p>
                            <h1 className="text-sm font-bold opacity-90">{user?.email}</h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-6 px-4 py-2 bg-emerald-950/50 rounded-2xl border border-emerald-800/50">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Shift Status</p>
                                <p className="text-xs font-bold text-white uppercase tracking-tighter">
                                    {shiftState.status.replace(/_/g, ' ')}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Revenue Today</p>
                                <p className="text-xs font-black text-emerald-400">₦{shiftRevenue.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Transactions</p>
                                <p className="text-xs font-black text-white">{transactions.length}</p>
                            </div>
                        </div>

                        {shiftState.status === 'no_shift' && (
                            <button onClick={startShift} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg active:scale-95">
                                Request Shift
                            </button>
                        )}

                        {shiftState.status === SHIFT_STATUS.OPEN && (
                            <button onClick={endShift} className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-400 transition-all shadow-lg active:scale-95">
                                End Shift
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Column 1: Order Terminal & Active Orders (8/12) */}
                <div className="lg:col-span-8 space-y-6">
                    {shiftState.status === SHIFT_STATUS.PENDING_DECLARATION && (
                        <ShiftSettlementPanel shiftId={shiftState.shift.id} onSuccess={refreshShift} />
                    )}

                    {shiftState.status === SHIFT_STATUS.AWAITING_APPROVAL && (
                        <div className="bg-white rounded-[2rem] border-2 border-amber-200 p-12 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-500">
                            <div className="p-6 bg-amber-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                                <Clock className="w-10 h-10 text-amber-600 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Shift Locked — Awaiting Manager Approval</h3>
                            <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">
                                Your declaration has been submitted. The terminal is now locked pending manager reconciliation and final shift closure.
                            </p>
                        </div>
                    )}

                    {(shiftState.status === SHIFT_STATUS.OPEN || shiftState.status === 'no_shift' || shiftState.status === SHIFT_STATUS.REQUESTED) && (
                        <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row h-[600px]">
                            {/* Menu Area */}
                            <div className="flex-1 flex flex-col border-r border-slate-50">
                                <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search inventory items..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {menuItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            disabled={shiftState.status !== SHIFT_STATUS.OPEN || item.current_stock <= 0}
                                            className="bg-slate-50 p-4 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left disabled:opacity-50 relative group"
                                        >
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                                                {item.current_stock <= 0 ? 'Out of Stock' : 'Saleable Asset'}
                                            </p>
                                            <h4 className="font-bold text-slate-900 text-sm mb-2">{item.name}</h4>
                                            <p className="text-xl font-black text-slate-800">₦{Number(item.sale_price).toLocaleString()}</p>
                                            <div className="mt-2 text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                                                Stock: {item.current_stock} {item.unit}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Area */}
                            <div className="w-full md:w-80 flex flex-col bg-slate-50/50">
                                <div className="p-6 border-b border-slate-100 bg-white/50">
                                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                        Cart Session
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {cart.map(i => (
                                        <div key={i.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-2 shadow-sm">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-xs truncate">{i.name}</p>
                                                <p className="text-[10px] text-slate-400">₦{i.price.toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updateQty(i.id, -1)} className="p-1 hover:bg-slate-50 rounded-lg"><Minus className="w-3 h-3 text-slate-400" /></button>
                                                <span className="text-xs font-black text-slate-900">{i.quantity}</span>
                                                <button onClick={() => updateQty(i.id, 1)} className="p-1 hover:bg-slate-50 rounded-lg"><Plus className="w-3 h-3 text-slate-400" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                                    <div className="space-y-2">
                                        <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-xs font-medium" />
                                        <input type="text" placeholder="Table Ref" value={tableRef} onChange={(e) => setTableRef(e.target.value)} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-xs font-medium" />
                                    </div>
                                    <div className="flex justify-between items-center text-slate-900">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total</span>
                                        <span className="text-2xl font-black">₦{total.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={handleCreateOrder}
                                        disabled={cart.length === 0 || shiftState.status !== SHIFT_STATUS.OPEN}
                                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        Confirm Order
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Column 2: Feed & Sidebars (4/12) */}
                <div className="lg:col-span-4 space-y-6">
                    {(checkoutOrder || activeIntent) && (
                        <section className="bg-white rounded-[2rem] shadow-2xl border border-emerald-500/20 p-8 space-y-6 animate-in zoom-in-95">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black text-slate-900 uppercase">Settlement</h3>
                                <button onClick={() => { setCheckoutOrder(null); setActiveIntent(null); }} className="text-slate-300"><X className="w-5 h-5" /></button>
                            </div>
                            {checkoutOrder && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => createIntent(checkoutOrder, 'cash')} className="p-4 bg-emerald-50 rounded-2xl flex flex-col items-center gap-2 text-emerald-700 font-black text-[10px] uppercase border border-emerald-100">
                                        <Banknote className="w-6 h-6" /> Cash
                                    </button>
                                    <button onClick={() => createIntent(checkoutOrder, 'pos')} className="p-4 bg-blue-50 rounded-2xl flex flex-col items-center gap-2 text-blue-700 font-black text-[10px] uppercase border border-blue-100">
                                        <Smartphone className="w-6 h-6" /> POS Terminal
                                    </button>
                                    <button onClick={() => createIntent(checkoutOrder, 'transfer')} className="col-span-2 p-4 bg-slate-900 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-[10px] uppercase">
                                        <ArrowRight className="w-4 h-4" /> Bank Transfer
                                    </button>
                                </div>
                            )}
                            {activeIntent && (
                                <div className="p-6 bg-emerald-900 rounded-2xl text-white text-center space-y-4">
                                    <p className="text-[10px] uppercase opacity-60">Expected Amount</p>
                                    <h4 className="text-3xl font-black">₦{Number(activeIntent.expected_amount).toLocaleString()}</h4>
                                    <button onClick={() => confirmPayment()} className="w-full bg-white text-emerald-900 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">
                                        Verify & Settle
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 space-y-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            Inventory Awareness
                        </h3>
                        <div className="space-y-4">
                            {inventory.slice(0, 5).map(item => {
                                const stockPercent = Math.min(100, (item.current_stock / (item.min_stock * 3)) * 100);
                                return (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-900">{item.name}</p>
                                            <p className="text-slate-400">{item.current_stock} {item.unit} remaining</p>
                                        </div>
                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${Number(item.current_stock) < Number(item.min_stock) ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${stockPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                Settlement Feed
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {transactions.slice(0, 5).map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Banknote className="w-4 h-4" /></div>
                                        <div>
                                            <p className="font-black text-slate-900">₦{Number(tx.amount).toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400">{tx.payment_type}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">{new Date(tx.created_at).toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 flex justify-between items-center px-8 shadow-2xl">
                <div className="flex gap-8">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Shift Volume</p>
                        <p className="text-sm font-black text-slate-900">{transactions.length} Txns</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Shift Revenue</p>
                        <p className="text-sm font-black text-emerald-600">₦{shiftRevenue.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Tele-Sync: ACTIVE {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </footer>
        </div>
    );
};

export default StaffOperationalTerminal;
