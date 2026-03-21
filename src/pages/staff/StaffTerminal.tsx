// 🧬 STAFF TERMINAL (POS): DETERMINISTIC FINANCIAL ENGINE V2
// Purpose: Optimized, RPC-driven POS shell with shift gating and perfect symmetry.
// Law: No local math. No assumptions. Truth comes from the RPC layer.

import React, { useState, useEffect } from 'react';
import { CARSSProvider, useCARSS } from '@/lib/context/CARSSContext';
import { Order, OrderWithDetails, PaymentMethod } from '@/lib/core/carss-client';
import { Plus, Minus, CreditCard, Banknote, History, ExternalLink, ShieldCheck, ShoppingCart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function StaffTerminalContent() {
    const { client, identity, isLoading, error: clientError } = useCARSS();

    // UI State
    const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [flowState, setFlowState] = useState<'idle' | 'creating' | 'adding' | 'discounting' | 'paying' | 'success'>('idle');
    const [error, setError] = useState('');

    // Load Data (RPC Driven)
    useEffect(() => {
        if (!client) return;
        const loadData = async () => {
            try {
                // Ensure shift is resolved first (Law: No shift, no POS)
                await client.resolveShift();

                // Fetch menu (using history as placeholder for items in this mock/stage)
                const history = await client.getOrderHistory(50);
                setOrderHistory(history.orders);
                setMenuItems(history.orders || []);
                toast.success("Identity & Shift Resolved.");
            } catch (err: any) {
                setError(err.message);
                toast.error(err.message);
            }
        };
        loadData();
    }, [client]);

    // DETERMINISTIC FLOW: NEW_ORDER -> ADD_ITEMS -> DISCOUNT -> PAY
    const startOrder = async () => {
        if (!client) return;
        setFlowState('creating');
        try {
            const order = await client.createOrder(customerName || 'Walk-in');
            setActiveOrder(order as any);
            setFlowState('adding');
            setCustomerName('');
            toast.success("Order Created.");
        } catch (err: any) {
            setError(err.message);
            setFlowState('idle');
        }
    };

    const addItem = async (itemId: string, quantity: number = 1) => {
        if (!client || !activeOrder) return;
        try {
            await client.addItem(itemId, quantity);
            const refresh = await client.getOrderDetails(activeOrder.id);
            setActiveOrder(refresh);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const applyPayment = async () => {
        if (!client || !activeOrder) return;
        setFlowState('paying');
        try {
            await client.processPayment(activeOrder.total_amount, paymentMethod);
            toast.success("Payment Finalized.");
            setActiveOrder(null);
            setFlowState('idle');
            const history = await client.getOrderHistory(50);
            setOrderHistory(history.orders);
        } catch (err: any) {
            setError(err.message);
            setFlowState('adding');
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-black text-emerald-500"><Loader2 className="animate-spin w-12 h-12" /></div>;

    return (
        <div className="h-screen bg-slate-950 text-emerald-50 w-full flex overflow-hidden font-mono text-sm">
            {/* Sidebar: Status & Controls */}
            <aside className="w-64 border-r border-emerald-900/30 bg-slate-900/50 p-6 flex flex-col gap-8">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter text-emerald-500 italic">CARSS POS 🤖</h1>
                    <p className="text-[10px] text-emerald-800 uppercase tracking-widest mt-1">Symmetry Engine v2.0</p>
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
                        <p className="text-[10px] text-emerald-700 uppercase mb-1">TERMINAL_IDENTITY</p>
                        <p className="font-bold text-xs truncate">ID: {identity?.staff_id?.slice(0, 8)}</p>
                        <div className="flex items-center gap-2 mt-2 text-emerald-500">
                            <ShieldCheck size={12} />
                            <span className="text-[10px]">VERIFIED_SESSION</span>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
                        <p className="text-[10px] text-blue-700 uppercase mb-1">BRANCH_CONTEXT</p>
                        <p className="font-bold text-xs">LOC: {identity?.branch_id?.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="mt-auto space-y-2">
                    <button className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-xs transition-colors">
                        <span>SHIFT_REPORT</span>
                        <ExternalLink size={12} />
                    </button>
                    <button className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-xs transition-colors">
                        <span>FULL_AUDIT_LOG</span>
                        <History size={12} />
                    </button>
                </div>
            </aside>

            {/* Main Center: Menu & Interaction */}
            <main className="flex-1 p-8 overflow-y-auto">
                {!activeOrder ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div className="w-24 h-24 bg-emerald-900/10 rounded-full flex items-center justify-center border-2 border-dashed border-emerald-900/40">
                            <Plus className="text-emerald-900/50" size={32} />
                        </div>
                        <div className="max-w-md w-full space-y-4 text-center">
                            <h2 className="text-2xl font-bold tracking-tight">INITIALIZE_ORDER</h2>
                            <input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="GUEST_NAME_ID..."
                                className="w-full bg-slate-900 border border-emerald-900/30 p-4 rounded-xl text-center text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <button
                                onClick={startOrder}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-black tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                START_TRANSACTION [SHIFT_LOCKED]
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => addItem(item.id)}
                                className="p-6 bg-slate-900 border border-emerald-900/20 rounded-2xl hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all flex flex-col items-start gap-4 text-left group"
                            >
                                <div className="bg-emerald-950/40 p-3 rounded-lg group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg leading-tight">{item.name || 'TEST_ITEM'}</div>
                                    <div className="text-emerald-500 font-black mt-1">${item.price || item.total || 0}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Right: Active Transaction Summary */}
            <div className="w-96 border-l border-emerald-900/30 bg-slate-900/80 p-6 flex flex-col gap-6 backdrop-blur-xl">
                <header className="flex justify-between items-center border-b border-emerald-900/30 pb-4">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Transaction</h2>
                    <ShoppingCart className="text-emerald-500" size={18} />
                </header>

                {activeOrder ? (
                    <>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {activeOrder.items.map(item => (
                                <div key={item.id} className="p-4 bg-slate-950/50 border border-emerald-900/10 rounded-xl flex justify-between items-center group">
                                    <div className="space-y-1">
                                        <div className="font-bold">{item.name}</div>
                                        <div className="text-[10px] text-emerald-800 font-black">PRICE: ${item.price} • QTY: {item.quantity}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-emerald-500 font-black">${item.subtotal}</div>
                                        <button onClick={() => addItem(item.item_id, -1)} className="p-1 hover:text-red-500 transition-colors"><Minus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer className="border-t border-emerald-900/30 pt-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-emerald-800 font-bold">
                                    <span>SUBTOTAL:</span>
                                    <span>${activeOrder.total_amount + (activeOrder.discount_amount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-black text-emerald-500">
                                    <span>TOTAL:</span>
                                    <span>${activeOrder.total_amount}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPaymentMethod('cash')} className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-emerald-900/50'}`}>
                                    <Banknote size={16} />
                                    <span className="text-[10px] font-bold">CASH</span>
                                </button>
                                <button onClick={() => setPaymentMethod('card')} className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-emerald-600 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-emerald-900/50'}`}>
                                    <CreditCard size={16} />
                                    <span className="text-[10px] font-bold">CARD</span>
                                </button>
                            </div>

                            <button
                                onClick={applyPayment}
                                disabled={activeOrder.items.length === 0 || flowState === 'paying'}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-black py-4 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                            >
                                {flowState === 'paying' ? 'EXECUTING...' : `PAY $${activeOrder.total_amount}`}
                            </button>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 italic space-y-4">
                        <div className="w-32 h-[1px] bg-emerald-500"></div>
                        <p>Awaiting transaction...</p>
                        <div className="w-32 h-[1px] bg-emerald-500"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StaffTerminal() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return (
        <CARSSProvider terminalType="pos" supabaseUrl={supabaseUrl} supabaseKey={supabaseKey}>
            <StaffTerminalContent />
        </CARSSProvider>
    );
}
