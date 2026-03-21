// 📱 QR MENU: DETERMINISTIC CUSTOMER ORDERING V2
// Purpose: Zero-Hydration, high-res reflection for guest customers.
// Law: Pure function of backend state.

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    DeterministicShellProvider,
    useDeterministicShell,
    useActiveOrders
} from '@/components/DeterministicShellProvider';
import { ShoppingCart, CheckCircle, AlertTriangle, Loader2, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

function QRMenuContent() {
    const [searchParams] = useSearchParams();
    const tableId = searchParams.get('tableId') || 'GUEST';

    const { state, actions } = useDeterministicShell();
    const activeOrders = useActiveOrders();

    // ⚠️ ONLY UI STATE
    const [cart, setCart] = useState<Map<string, { name: string; price: number; quantity: number }>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);

    // Find my active order (Mirrored)
    const activeOrder = useMemo(() => {
        // In a real QR app, we would use a session-specific filter
        // For this demo, we look for 'open' orders
        return activeOrders.find(o => o.status === 'open') || null;
    }, [activeOrders]);

    // Menu (Dummy for symmetry demo)
    const menuItems = [
        { id: 'm1', name: 'Suya Platter', price: 4500 },
        { id: 'm2', name: 'Jollof Box', price: 3200 },
        { id: 'm3', name: 'Chapman Drink', price: 1500 },
    ];

    const addToCart = (item: any) => {
        setCart(prev => {
            const next = new Map(prev);
            const existing = next.get(item.id);
            if (existing) next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
            else next.set(item.id, { name: item.name, price: item.price, quantity: 1 });
            return next;
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => {
            const next = new Map(prev);
            const existing = next.get(id);
            if (!existing) return prev;
            if (existing.quantity > 1) next.set(id, { ...existing, quantity: existing.quantity - 1 });
            else next.delete(id);
            return next;
        });
    };

    const calculateTotal = () => {
        let t = 0;
        cart.forEach(v => t += v.price * v.quantity);
        return t;
    };

    // DETERMINISTIC TRANSMISSION
    const placeOrder = async () => {
        if (cart.size === 0) return;
        setIsProcessing(true);
        try {
            // 1. Initialize Order
            const { id: orderId } = await actions.createOrder(`Table ${tableId}`);

            // 2. Add Items (Symmetrical to POS)
            for (const [id, item] of cart.entries()) {
                await actions.addItem(orderId, item.name, item.price, item.quantity);
            }

            // 3. Finalize
            await actions.processPayment(orderId, calculateTotal(), 'qr_pay');

            setCart(new Map());
            toast.success("Order Processed Successfully");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (state.status === 'BOOTING') {
        return <div className="h-screen flex items-center justify-center bg-slate-950 text-orange-500"><Loader2 className="animate-spin w-12 h-12" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 font-mono selection:bg-orange-500 selection:text-black">
            <header className="flex justify-between items-center border-b border-orange-900/30 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-orange-500 italic">CARSS QR 🥘</h1>
                    <p className="text-[10px] text-orange-800 uppercase tracking-widest font-bold">Location_Symmetry_Mirror</p>
                </div>
                <div className="relative p-3 bg-orange-950/20 rounded-full border border-orange-900/30">
                    <ShoppingCart className="w-6 h-6 text-orange-500" />
                    {cart.size > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                            {Array.from(cart.values()).reduce((a, b) => a + b.quantity, 0)}
                        </span>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Menu */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black border-l-4 border-orange-500 pl-4 italic">MENU_CATALOG</h2>
                    {menuItems.map(item => (
                        <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-orange-500/50 transition-all flex justify-between items-center group">
                            <div>
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-orange-500 font-black text-xl">${item.price}</p>
                            </div>
                            <button onClick={() => addToCart(item)} className="bg-orange-600 hover:bg-orange-500 text-black font-black p-3 rounded-xl transform active:scale-95 transition-all">ADD</button>
                        </div>
                    ))}
                </div>

                {/* Basket & Status */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit sticky top-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>
                        <h2 className="text-xl font-bold mb-4 tracking-tighter">EXECUTION_STACK</h2>

                        {cart.size === 0 ? (
                            <div className="py-12 text-center text-slate-700 italic space-y-4">
                                <p>EMPTY_INPUT_BUFFER</p>
                                <div className="w-12 h-[1px] bg-slate-800 mx-auto"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Array.from(cart.entries()).map(([id, item]) => (
                                    <div key={id} className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => removeFromCart(id)} className="p-1 hover:text-orange-500"><Minus size={14} /></button>
                                            <span className="font-bold">{item.name} [x{item.quantity}]</span>
                                            <button onClick={() => addToCart({ id, ...item })} className="p-1 hover:text-orange-500"><Plus size={14} /></button>
                                        </div>
                                        <span className="font-black text-orange-400">${item.price * item.quantity}</span>
                                    </div>
                                ))}
                                <div className="pt-4 flex justify-between text-3xl font-black text-orange-500 italic">
                                    <span>TOTAL:</span>
                                    <span>${calculateTotal()}</span>
                                </div>
                                <button
                                    onClick={placeOrder}
                                    disabled={isProcessing}
                                    className="w-full bg-orange-600 py-5 rounded-2xl font-black text-black text-lg tracking-widest hover:bg-orange-500 disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(249,115,22,0.2)] flex items-center justify-center gap-3"
                                >
                                    {isProcessing && <Loader2 className="animate-spin w-6 h-6" />}
                                    COMMIT_AND_PAY
                                </button>
                            </div>
                        )}

                        {state.status === 'ERROR' && (
                            <div className="mt-4 p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                                <AlertTriangle className="text-red-500" />
                                <p className="text-[10px] text-red-500 font-bold uppercase">{state.error.message}</p>
                            </div>
                        )}
                    </div>

                    {/* Live Mirror Feedback */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                            <h3 className="text-xs font-black text-emerald-500 uppercase">Live_Mirror_Verified</h3>
                        </div>
                        <div className="space-y-2 opacity-60">
                            {state.status === 'MIRRORING' && (
                                <>
                                    <div className="flex justify-between text-[10px]">
                                        <span>SERVER_TIMESTAMP:</span>
                                        <span>{state.state.timestamp}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span>SYNC_VERSION:</span>
                                        <span>v{state.state.version}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QRMenuPage() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branchId');

    return (
        <DeterministicShellProvider
            terminalType="qr"
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
            branchId={branchId || undefined}
        >
            <QRMenuContent />
        </DeterministicShellProvider>
    );
}
