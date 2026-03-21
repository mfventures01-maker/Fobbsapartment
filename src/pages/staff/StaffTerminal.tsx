// 🛸 STAFF TERMINAL: DETERMINISTIC POS INTERFACE
// Purpose: A pure reflection of the backend state mirror.
// Law: No local business state. No race conditions.

import React, { useState } from 'react';
import {
    DeterministicShellProvider,
    useDeterministicShell,
    useActiveOrders,
    useKitchenQueue,
    useShiftInfo
} from '@/components/DeterministicShellProvider';
import {
    Plus, ShoppingCart, Loader2, AlertTriangle,
    Banknote, CreditCard, History, ShieldCheck,
    LogOut, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// PURE REFLECTION COMPONENT
// ============================================

function StaffTerminalContent() {
    const { state, actions } = useDeterministicShell();

    // SELECTORS (Mirrored State)
    const activeOrders = useActiveOrders();
    const kitchenQueue = useKitchenQueue();
    const shift = useShiftInfo();

    // LATEST ORDER (Derived)
    const activeOrder = activeOrders.find(o => o.status === 'open') || null;

    // ⚠️ ONLY UI STATE ALLOWED
    const [customerName, setCustomerName] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [showNewOrder, setShowNewOrder] = useState(false);

    // Dummy menu (In real app, fetch from backend)
    const menuItems = [
        { id: '1', name: 'Standard Suite', price: 15000 },
        { id: '2', name: 'Executive Room', price: 25000 },
        { id: '3', name: 'Room Service: Breakfast', price: 3500 },
        { id: '4', name: 'Mini Bar: Drinks', price: 1200 },
    ];

    // ACTION HANDLERS
    const handleNewOrder = async () => {
        try {
            await actions.createOrder(customerName || 'Walk-in');
            setCustomerName('');
            setShowNewOrder(false);
            toast.success("Order Initialized");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleAddItem = async (item: any) => {
        if (!activeOrder) return;
        try {
            await actions.addItem(activeOrder.id, item.name, item.price, 1);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handlePayment = async () => {
        if (!activeOrder) return;
        try {
            await actions.processPayment(activeOrder.id, activeOrder.total, paymentMethod);
            toast.success("Transaction Finalized");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // RENDERING LOGIC
    if (state.status === 'BOOTING') {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-blue-500 font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin w-12 h-12" />
                    <p className="animate-pulse">ESTABLISHING_DETERMINISTIC_MIRROR...</p>
                </div>
            </div>
        );
    }

    if (state.status === 'ERROR') {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500 font-mono p-8">
                <div className="max-w-md text-center space-y-4 border border-red-900/30 p-8 rounded-2xl bg-red-950/10">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-black">MIRROR_DESYNC_FATAL</h2>
                    <p className="text-xs text-red-400 font-mono opacity-60 leading-relaxed uppercase">{state.error.message}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold">RE_ESTABLISH_MIRROR</button>
                </div>
            </div>
        );
    }

    const { state: mirror } = state;

    return (
        <div className="h-screen bg-slate-950 text-blue-50 w-full flex overflow-hidden font-mono text-xs uppercase tracking-tighter">
            {/* Sidebar - Meta Info */}
            <aside className="w-64 border-r border-blue-900/30 bg-slate-900/50 p-6 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-blue-400 leading-none">CARSS POS🛸</h1>
                    <p className="text-[9px] text-blue-800 font-bold mt-1">DETERMINISTIC_SHELL_V1</p>
                </div>

                <div className="space-y-3">
                    <div className="p-3 bg-blue-950/20 border border-blue-900/20 rounded-lg">
                        <p className="text-[9px] text-blue-700">SHIFT_BALANCE</p>
                        <p className="text-lg font-black text-blue-300">${shift.cash_balance.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/20 rounded-lg">
                        <p className="text-[9px] text-emerald-700">MIRROR_STATUS</p>
                        <div className="flex items-center gap-2 text-emerald-500 font-bold">
                            <ShieldCheck size={14} /> <span>LIVE_SYNC</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto space-y-2">
                    <button className="w-full p-3 bg-slate-800/50 hover:bg-red-900/20 border border-slate-700 rounded-lg flex items-center justify-between transition-colors text-red-400">
                        <span>TERMINATE_SESSION</span>
                        <LogOut size={14} />
                    </button>
                </div>
            </aside>

            {/* Main Container */}
            <main className="flex-1 flex overflow-hidden">
                {/* Menu/Catalog */}
                <section className="flex-1 p-8 overflow-y-auto space-y-8">
                    <header className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-blue-400 border-l-4 border-blue-500 pl-4 italic">Instruction_Tape</h2>
                        <div className="text-[10px] text-blue-900">LAST_SYNC: {new Date(state.lastSync).toLocaleTimeString()}</div>
                    </header>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleAddItem(item)}
                                disabled={!activeOrder}
                                className="p-6 bg-slate-900 border border-blue-900/10 rounded-2xl hover:border-blue-500 transition-all text-left flex flex-col justify-between h-40 group relative overflow-hidden disabled:opacity-20"
                            >
                                <div className="absolute -right-4 -top-4 bg-blue-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                                <Plus className="text-blue-500 mb-2 group-hover:scale-125 transition-transform" />
                                <div>
                                    <div className="font-black text-sm">{item.name}</div>
                                    <div className="text-blue-500 font-black text-lg">${item.price}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Action Panel (Mirror) */}
                <section className="w-96 border-l border-blue-900/30 bg-slate-900/80 p-6 flex flex-col gap-6">
                    <header className="flex justify-between items-center border-b border-blue-900/20 pb-4">
                        <h2 className="text-lg font-black italic">TRANSACTION_QUEUE</h2>
                        <ShoppingCart className="text-blue-500" size={18} />
                    </header>

                    {!activeOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            {showNewOrder ? (
                                <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-[10px] font-bold text-blue-700">IDENTIFY_GUEST</p>
                                    <input
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-slate-950 border border-blue-900 p-4 rounded-xl text-center font-black focus:border-blue-400 outline-none"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleNewOrder} className="bg-blue-600 py-3 rounded-lg font-black text-black">COMMIT</button>
                                        <button onClick={() => setShowNewOrder(false)} className="bg-slate-800 py-3 rounded-lg font-black">VOID</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowNewOrder(true)} className="group flex flex-col items-center gap-4 p-8 border-2 border-dashed border-blue-900/40 rounded-3xl hover:border-blue-500/50 transition-all">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-black transition-all">
                                        <Plus size={32} />
                                    </div>
                                    <span className="font-bold text-blue-900 group-hover:text-blue-400">OPEN_GUEST_CHANNEL</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end border-b border-blue-900/10 pb-4">
                                <div>
                                    <div className="text-[10px] text-blue-800 font-bold">ACTIVE_CHANNEL</div>
                                    <div className="text-sm font-black text-blue-400">{activeOrder.customer_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-blue-800 font-bold">ID_REF</div>
                                    <div className="text-xs font-mono">{activeOrder.id.slice(0, 8)}</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {activeOrder.items?.map(item => (
                                    <div key={item.id} className="p-4 bg-slate-950/50 border border-blue-900/10 rounded-xl flex justify-between items-center group">
                                        <div className="space-y-1">
                                            <div className="font-black text-blue-100">{item.name}</div>
                                            <div className="text-[9px] text-blue-800 font-bold">QTY: {item.qty} • UNIT: ${item.unit_price}</div>
                                        </div>
                                        <div className="text-blue-500 font-black">${item.line_total}</div>
                                    </div>
                                ))}
                            </div>

                            <footer className="border-t border-blue-900/30 pt-6 space-y-6">
                                <div className="flex justify-between text-2xl font-black text-blue-400 italic">
                                    <span>TOTAL:</span>
                                    <span>${activeOrder.total.toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setPaymentMethod('cash')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-blue-900/30'}`}>
                                        <Banknote size={16} /> <span className="text-[9px] font-black">CASH</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('card')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-blue-900/30'}`}>
                                        <CreditCard size={16} /> <span className="text-[9px] font-black">CARD</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('transfer')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-blue-900/30'}`}>
                                        <History size={16} /> <span className="text-[9px] font-black">WIRE</span>
                                    </button>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={activeOrder.items?.length === 0 || state.status === 'TRANSMITTING'}
                                    className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-black text-lg tracking-widest shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all flex items-center justify-center gap-3"
                                >
                                    {state.status === 'TRANSMITTING' && <Loader2 className="animate-spin w-5 h-5" />}
                                    EXECUTE_TRANSACTION
                                </button>

                                <button
                                    onClick={async () => {
                                        const reason = prompt('VOID_REASON:');
                                        if (reason) await actions.voidOrder(activeOrder.id, reason);
                                    }}
                                    className="w-full text-red-900 hover:text-red-500 transition-colors text-[10px] font-black tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={12} /> VOID_CHANNEL_SEQUENCE
                                </button>
                            </footer>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}

// ============================================
// EXPORT WITH PROVIDER 🛸
// ============================================

export default function StaffTerminal() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return (
        <DeterministicShellProvider
            terminalType="pos"
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
        >
            <StaffTerminalContent />
        </DeterministicShellProvider>
    );
}
