// 🛸 STAFF TERMINAL V3: DETERMINISTIC POS INTERFACE
// Purpose: A pure reflection of the backend state with Diff-Driven Animations.
// Features: Sync Status, Pending Action Indicators, High-Fisidety transitions.

import React, { useState } from 'react';
import {
    DeterministicShellProvider,
    useDeterministicShell,
    useActiveOrders,
    useKitchenQueue,
    useShiftInfo,
    useOrderAnimation
} from '@/components/DeterministicShellProvider';
import {
    Plus, ShoppingCart, Loader2, AlertTriangle,
    Banknote, CreditCard, History, ShieldCheck,
    LogOut, Trash2, Zap, Hourglass, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// ANIMATED ORDER ROW
// ============================================

function OrderItemRow({ item }: { item: any }) {
    // Diff animations can be added here if we track sub-item diffs
    return (
        <div className="p-4 bg-slate-950/50 border border-blue-900/10 rounded-xl flex justify-between items-center group transition-all">
            <div className="space-y-1">
                <div className="font-black text-blue-100">{item.name}</div>
                <div className="text-[9px] text-blue-800 font-bold uppercase">QTY: {item.qty} • UNIT: ${item.unit_price}</div>
            </div>
            <div className="text-blue-500 font-black tracking-tighter">${item.line_total}</div>
        </div>
    );
}

// ============================================
// PURE REFLECTION COMPONENT
// ============================================

function StaffTerminalContent() {
    const { state, actions, syncStatus } = useDeterministicShell();
    const activeOrders = useActiveOrders();
    const shift = useShiftInfo();

    const activeOrder = activeOrders.find(o => o.status === 'open') || null;
    const animation = useOrderAnimation(activeOrder?.id || '');

    // ⚠️ ONLY UI STATE ALLOWED
    const [customerName, setCustomerName] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [showNewOrder, setShowNewOrder] = useState(false);

    // Dummy menu
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
                    <p className="animate-pulse tracking-widest font-black uppercase">BOOTING_SYMMETRY_CORE...</p>
                </div>
            </div>
        );
    }

    if (state.status === 'ERROR') {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500 font-mono p-8">
                <div className="max-w-md text-center space-y-4 border border-red-900/30 p-8 rounded-2xl bg-red-950/10">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic">MIRROR_DESYNC_FATAL</h2>
                    <p className="text-xs text-red-400 font-mono opacity-60 leading-relaxed uppercase">{state.error?.message}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-3">
                        <RefreshCw size={14} /> RE_ESTABLISH_MIRROR
                    </button>
                </div>
            </div>
        );
    }

    const isTransmitting = state.status === 'TRANSMITTING';
    const hasPending = state.pendingActions.length > 0;

    return (
        <div className="h-screen bg-slate-950 text-blue-50 w-full flex overflow-hidden font-mono text-xs uppercase tracking-tighter">
            {/* Sidebar - Meta Info */}
            <aside className="w-64 border-r border-blue-900/20 bg-slate-900/50 p-6 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-blue-400 leading-none">CARSS POS🛸</h1>
                    <p className="text-[9px] text-blue-800 font-bold mt-1">DETERMINISTIC_SHELL_V5</p>
                </div>

                <div className="space-y-3">
                    <div className="p-3 bg-blue-950/20 border border-blue-900/20 rounded-lg">
                        <p className="text-[9px] text-blue-700">SHIFT_BALANCE</p>
                        <p className="text-lg font-black text-blue-300 italic">${shift.cash_balance.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/20 rounded-lg">
                        <p className="text-[9px] text-emerald-700">MIRROR_STATUS</p>
                        <div className="flex items-center gap-2 text-emerald-500 font-bold">
                            <Zap size={10} className="animate-pulse" /> <span>LIVE_PULSE_OK</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto space-y-2">
                    <button className="w-full p-3 bg-slate-800/50 hover:bg-red-900/20 border border-slate-700 rounded-xl flex items-center justify-between transition-all text-red-400 group">
                        <span className="font-black">TERMINATE_SESSION</span>
                        <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* Main Container */}
            <main className="flex-1 flex overflow-hidden">
                {/* Menu Catalog */}
                <section className="flex-1 p-8 overflow-y-auto space-y-8 relative">
                    <header className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-blue-400 border-l-4 border-blue-500 pl-4 italic">Instruction_Tape</h2>
                        <div className="flex items-center gap-4 text-[10px] text-blue-900 font-bold">
                            {isTransmitting && <div className="flex items-center gap-2 text-blue-400"><Hourglass size={12} className="animate-spin" /> BROADCASTING_ACTION...</div>}
                            {hasPending && <div className="text-yellow-600 animate-pulse">{state.pendingActions.length}_QUEUED</div>}
                            <span>LAST_SYNC: {new Date(state.lastSync || 0).toLocaleTimeString()}</span>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleAddItem(item)}
                                disabled={!activeOrder || isTransmitting}
                                className="p-6 bg-slate-900 border border-blue-900/10 rounded-2xl hover:border-blue-500 transition-all text-left flex flex-col justify-between h-44 group relative overflow-hidden disabled:opacity-20 active:scale-95 duration-200"
                            >
                                <div className="absolute -right-4 -top-4 bg-blue-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                                <div className="w-10 h-10 bg-blue-950/50 rounded-lg flex items-center justify-center border border-blue-900/20 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-black transition-all">
                                    <Plus size={18} />
                                </div>
                                <div>
                                    <div className="font-black text-sm tracking-tight">{item.name}</div>
                                    <div className="text-blue-500 font-black text-2xl tracking-tighter italic">${item.price}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Action Panel (The Mirror) */}
                <section className={`w-[450px] border-l border-blue-900/20 bg-slate-900/80 p-8 flex flex-col gap-8 transition-all duration-500 ${animation === 'updated' ? 'bg-blue-900/10 ring-4 ring-blue-500 ring-inset' : ''}`}>
                    <header className="flex justify-between items-center border-b border-blue-900/20 pb-6">
                        <h2 className="text-xl font-black italic tracking-tighter">OPERATION_MIRROR</h2>
                        <div className="flex items-center gap-3">
                            {hasPending && <Loader2 className="animate-spin text-blue-500" size={18} />}
                            <ShoppingCart className="text-blue-500" size={18} />
                        </div>
                    </header>

                    {!activeOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                            {showNewOrder ? (
                                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-blue-700 tracking-widest pl-1">IDENTIFY_GUEST_CHANNEL</p>
                                        <input
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full bg-slate-950 border border-blue-900/40 p-5 rounded-2xl text-center font-black text-lg focus:border-blue-400 outline-none transition-all placeholder:opacity-20"
                                            placeholder="WALK_IN_GUEST"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={handleNewOrder} className="bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-black transition-all shadow-lg active:scale-95">COMMIT</button>
                                        <button onClick={() => setShowNewOrder(false)} className="bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-black transition-all shadow-lg active:scale-95 text-blue-400">ABORT</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowNewOrder(true)} className="group flex flex-col items-center gap-6 p-12 border-2 border-dashed border-blue-900/40 rounded-[40px] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-black transition-all group-hover:rotate-90 duration-500 shadow-inner">
                                        <Plus size={40} />
                                    </div>
                                    <div className="text-center">
                                        <span className="font-black text-blue-900 group-hover:text-blue-400 block text-lg transition-colors">INIT_CHANNEL_SEQUENCE</span>
                                        <span className="text-[10px] font-bold text-blue-950 block mt-1">AWAITING_INITIALIZATION</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end border-b border-blue-900/10 pb-6">
                                <div>
                                    <div className="text-[10px] text-blue-800 font-black tracking-widest mb-1">ACTIVE_CHANNEL</div>
                                    <div className="text-lg font-black text-blue-400 italic tracking-tighter">{activeOrder.customer_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-blue-800 font-black tracking-widest mb-1">ID_SEQUENCE</div>
                                    <div className="text-xs font-mono text-blue-100">{activeOrder.id.slice(0, 13)}...</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                                {activeOrder.items?.map(item => (
                                    <OrderItemRow key={item.id} item={item} />
                                ))}
                                {activeOrder.items?.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                        <p>NULL_INPUT_BUFFER</p>
                                    </div>
                                )}
                            </div>

                            <footer className="border-t border-blue-900/20 pt-8 space-y-8">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-lg font-black italic text-blue-700">SUBTOTAL:</span>
                                    <span className="text-4xl font-black text-blue-400 italic tracking-tighter shadow-blue-500/20">${activeOrder.total.toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300 ${paymentMethod === 'cash' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_30px_rgba(59,130,246,0.25)] scale-105' : 'bg-slate-900 border-blue-900/20 opacity-60'}`}>
                                        <Banknote size={20} /> <span className="text-[10px] font-black tracking-tighter">CASH_LIQUID</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('card')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300 ${paymentMethod === 'card' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_30px_rgba(59,130,246,0.25)] scale-105' : 'bg-slate-900 border-blue-900/20 opacity-60'}`}>
                                        <CreditCard size={20} /> <span className="text-[10px] font-black tracking-tighter">CREDIT_TRANS</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('transfer')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300 ${paymentMethod === 'transfer' ? 'bg-blue-600 border-blue-500 text-black shadow-[0_0_30px_rgba(59,130,246,0.25)] scale-105' : 'bg-slate-900 border-blue-900/20 opacity-60'}`}>
                                        <History size={20} /> <span className="text-[10px] font-black tracking-tighter">SWIFT_WIRE</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handlePayment}
                                        disabled={activeOrder.items?.length === 0 || isTransmitting}
                                        className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black text-black text-xl tracking-[0.2em] shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-4 group active:scale-[0.98] disabled:opacity-20"
                                    >
                                        {isTransmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <ShieldCheck className="group-hover:rotate-12 transition-transform" size={24} />}
                                        FINALIZE_TRANSACTION
                                    </button>

                                    <button
                                        onClick={async () => {
                                            const reason = prompt('VOID_PROTOCOL_REASON:');
                                            if (reason) await actions.voidOrder(activeOrder.id, reason);
                                        }}
                                        className="w-full text-red-900 hover:text-red-500 transition-colors text-[10px] font-black tracking-[0.4em] flex items-center justify-center gap-3 py-2 uppercase"
                                    >
                                        <Trash2 size={12} /> VOID_STATION_CHANNEL
                                    </button>
                                </div>
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
