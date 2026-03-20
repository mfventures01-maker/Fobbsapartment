import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabaseClient';
import {
    Zap, ShoppingCart,
    Activity,
    Plus, Minus, Search,
    Clock, Banknote, Smartphone, X, AlertOctagon, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { InventoryItem, PaymentIntent } from '@/types/database';
import { SHIFT_STATUS } from '@/constants/shiftStatus';
import { useSystemState } from '@/hooks/useSystemState';
import { safeNumber } from '@/lib/safeNumber';
import { callRPC } from '@/lib/rpcClient';
import { createStaffOrder, confirmPaymentIntent } from '@/services/staffService';

// --- SUB-COMPONENTS (DETERMINISTIC MODULES) ---

const ShiftPanel = ({ shift, revenue, transactions }: any) => (
    <div className="bg-emerald-950 text-white p-6 rounded-[2rem] border border-emerald-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Clock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Active Session</p>
                <h3 className="text-xl font-black tracking-tight uppercase">{shift?.status.replace(/_/g, ' ') || 'No Active Shift'}</h3>
            </div>
        </div>
        <div className="flex gap-10">
            <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Shift Revenue</p>
                <p className="text-2xl font-black text-white">₦{safeNumber(revenue)}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Ledger Entry</p>
                <p className="text-2xl font-black text-white">{transactions?.length || 0} TX</p>
            </div>
        </div>
    </div>
);

const AlertPanel = ({ alerts = [] }: { alerts: any[] }) => (
    <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">System Telemetry</h3>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Pulse</span>
            </div>
        </div>
        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
            {alerts.length === 0 ? (
                <p className="text-[9px] text-slate-500 font-bold uppercase py-4 text-center">All systems operational</p>
            ) : (
                alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <AlertOctagon className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-300 font-medium leading-relaxed">{alert.message || alert.event_type}</p>
                    </div>
                ))
            )}
        </div>
    </div>
);

const StaffOperationalTerminal: React.FC = () => {
    const { authority, staffId } = useAuth();
    const { shiftState, endShift } = useShiftState();
    const {
        revenue,
        recent_transactions: transactions,
        alerts,
        refresh: refreshSystem
    } = useSystemState();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIntent, setActiveIntent] = useState<PaymentIntent | null>(null);
    const [customerName, setCustomerName] = useState('');

    // --- HYDRATION ---
    const hydrate = useCallback(async () => {
        if (!authority.businessId || !authority.branchId) return;
        const data = await callRPC<InventoryItem[]>('staff', 'get_active_inventory', {
            p_location_id: authority.branchId
        });
        setInventory(data || []);
    }, [authority.businessId, authority.branchId]);

    useEffect(() => {
        hydrate();
        const channel = supabase.channel('staff-ops-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `branch_id=eq.${authority.branchId}` }, () => hydrate())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [hydrate, authority.branchId]);

    // --- CART LOGIC ---
    const addToCart = (item: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.quantity >= item.current_stock) {
                    toast.error('Inventory Exhausted');
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id) {
                const newQty = Math.max(0, i.quantity + delta);
                if (newQty > i.current_stock) {
                    toast.error('Stock Limit Reached');
                    return i;
                }
                return { ...i, quantity: newQty };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    let cartTotal = 0;
    cart.forEach(i => { cartTotal += (Number(i.sale_price) * i.quantity); });

    // --- ORDER GESTALT ---
    const handleCheckout = async () => {
        if (!staffId || !authority.businessId || !authority.branchId) {
            toast.error('Identity Resolution Failure');
            return;
        }

        const loading = toast.loading('Finalizing Order Ledger...');
        try {
            const result = await createStaffOrder(
                authority.businessId,
                authority.branchId,
                staffId,
                cart.map(i => ({
                    item_id: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.sale_price
                })),
                { customer_name: customerName || 'Walk-in' }
            );

            if (!result || !result.success) throw new Error('Order creation failed');

            toast.success('Order Secured', { id: loading });

            // Resolve the intent for the Payment Panel
            const intent = await callRPC<PaymentIntent>('staff', 'get_intent_by_id', {
                p_intent_id: result.payment_intent_id,
                _idempotency_key: crypto.randomUUID()
            });
            setActiveIntent(intent);
            setCart([]);
            setCustomerName('');
            refreshSystem(authority.businessId, authority.branchId);
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    // --- PAYMENT HANDSHAKE ---
    const handlePaymentConfirm = async (method: string) => {
        if (!activeIntent) return;
        const loading = toast.loading(`Confirming ${method.toUpperCase()} Settlement...`);
        try {
            // 1. Update Intent with specific method via RPC (Pure SSOT)
            await callRPC('staff', 'set_intent_payment_method', {
                p_intent_id: activeIntent.id,
                p_method: method,
                _idempotency_key: crypto.randomUUID()
            });

            // 2. Execute RPC Confirmation
            const res = await confirmPaymentIntent(activeIntent.id);
            if (!res || !res.success) throw new Error('Payment confirmation failed');

            toast.success('Funds Verified & Logged', { id: loading });
            setActiveIntent(null);
            refreshSystem(authority.businessId!, authority.branchId!);
        } catch (err: any) {
            toast.error(err.message, { id: loading });
        }
    };

    const filteredMenu = inventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-700">

            {/* MODULE 1: SHIFT PANEL */}
            <ShiftPanel
                shift={shiftState.status === SHIFT_STATUS.OPEN ? shiftState.shift : null}
                revenue={revenue?.shift_total || 0}
                transactions={transactions}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sticky top-6">

                {/* MODULE 2: ORDER PANEL (LEFT 8/12) */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[700px]">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                                    <ShoppingCart className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Staff Order Entry</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory-Locked Gateway</p>
                                </div>
                            </div>
                            <div className="relative w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Scan or Search Items..."
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 gap-6 align-start content-start">
                            {filteredMenu.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    disabled={item.current_stock <= 0}
                                    className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all text-left flex flex-col justify-between disabled:opacity-50 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${item.current_stock < item.min_stock ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {item.current_stock} Left
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-800 leading-tight mb-1">{item.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-4">{(item as any).category || 'Standard'}</p>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">₦{safeNumber(item.sale_price)}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MODULE 3: PAYMENT PANEL & CART (RIGHT 4/12) */}
                <div className="lg:col-span-4 space-y-8">

                    {/* CART SUMMARY */}
                    <div className="bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col h-[500px] border border-slate-800">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-white font-black uppercase tracking-widest text-xs">Checkout Stream</h3>
                            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black">{cart.length} Items</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                                    <ShoppingCart className="w-12 h-12" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-white mb-1">{item.name}</p>
                                            <p className="text-[10px] font-black text-slate-500">₦{safeNumber(item.sale_price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
                                            <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><Minus className="w-3 h-3" /></button>
                                            <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><Plus className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-8 bg-black/40 border-t border-white/5 space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payable</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">₦{safeNumber(cartTotal)}</h3>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Confirm Order
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT PANEL (ACTIVE INTENT) */}
                    {activeIntent && (
                        <div className="bg-indigo-600 rounded-[3.5rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500 text-white border-2 border-indigo-400/30">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black uppercase tracking-widest text-xs">Awaiting Settlement</h3>
                                <button onClick={() => setActiveIntent(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-[10px] font-black uppercase opacity-60 mb-2">Transaction ID: {activeIntent.id.slice(0, 8)}</p>
                                <h4 className="text-5xl font-black tracking-tighter">₦{safeNumber(activeIntent.expected_amount)}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handlePaymentConfirm('cash')} className="p-6 bg-white/10 rounded-3xl border border-white/10 flex flex-col items-center gap-3 hover:bg-white/20 transition-all">
                                    <Banknote className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                                </button>
                                <button onClick={() => handlePaymentConfirm('pos')} className="p-6 bg-white/10 rounded-3xl border border-white/10 flex flex-col items-center gap-3 hover:bg-white/20 transition-all">
                                    <Smartphone className="w-8 h-8" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">POS</span>
                                </button>
                                <button onClick={() => handlePaymentConfirm('transfer')} className="col-span-2 p-6 bg-white text-indigo-600 rounded-3xl flex items-center justify-center gap-4 font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                                    <TrendingUp className="w-5 h-5" /> Confirm Bank Transfer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MODULE 4: ALERT PANEL */}
                    <AlertPanel alerts={alerts} />
                </div>
            </div>

            {/* PERSISTENT FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center px-4">
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Terminal Role</p>
                            <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-amber-500" /> {authority.role?.toUpperCase()} TERMINAL
                            </p>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Identity</p>
                            <p className="text-xs font-black text-slate-900">{staffId?.slice(0, 8).toUpperCase()} (STAFF)</p>
                        </div>
                    </div>

                    <button
                        onClick={endShift}
                        className="bg-rose-50 text-rose-600 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                    >
                        Emergency Shift Closure
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default StaffOperationalTerminal;
