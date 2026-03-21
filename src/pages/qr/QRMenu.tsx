// 📱 QR MENU: DETERMINISTIC CUSTOMER ORDERING
// Purpose: Zero-assumption order flow for guest customers.
// Law: Reflection of the backend state machine.

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CARSSProvider, useCARSS } from '@/lib/context/CARSSContext';
import { OrderWithDetails } from '@/lib/core/carss-client';
import { ShoppingCart, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function QRMenuContent() {
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branchId');
    const tableId = searchParams.get('tableId');

    const { client, identity, isLoading, error: clientError } = useCARSS();

    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<Map<string, { item: any; quantity: number }>>(new Map());
    const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
    const [orderStatus, setOrderStatus] = useState<'idle' | 'creating' | 'adding' | 'paying' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!client) return;
        const loadMenu = async () => {
            try {
                // In a real app, this would be an RPC like get_qr_menu
                const items = await client.getOrderHistory(100); // Placeholder for menu fetch
                setMenuItems(items.orders || []); // Adjusting to the real system's menu logic eventually
            } catch (err) {
                console.error("Failed to load menu", err);
            }
        };
        loadMenu();
    }, [client]);

    const addToCart = (item: any) => {
        setCart(prev => {
            const newCart = new Map(prev);
            const existing = newCart.get(item.id);
            if (existing) newCart.set(item.id, { item, quantity: existing.quantity + 1 });
            else newCart.set(item.id, { item, quantity: 1 });
            return newCart;
        });
    };

    const calculateTotal = () => {
        let total = 0;
        cart.forEach(({ item, quantity }) => total += (item.price || item.total) * quantity);
        return total;
    };

    // DETERMINISTIC FLOW: INIT -> VALIDATE -> CREATE -> ADD -> PAY -> COMPLETE
    const placeOrder = async () => {
        if (!client) return;
        setOrderStatus('creating');
        try {
            // 1. Create Order
            const newOrder = await client.createOrder(`Table ${tableId || 'QR Guest'}`);
            setOrderStatus('adding');

            // 2. Add Items
            for (const [itemId, { item, quantity }] of cart.entries()) {
                await client.addItem(itemId, quantity);
            }

            setOrderStatus('paying');

            // 3. Process Payment
            await client.processPayment(calculateTotal(), 'qr_pay');

            // 4. Success
            const finalOrder = await client.getOrderDetails(newOrder.id);
            setActiveOrder(finalOrder);
            setOrderStatus('success');
            setCart(new Map());
            toast.success("Order placed successfully!");
        } catch (err: any) {
            setOrderStatus('error');
            setErrorMessage(err.message);
            toast.error(err.message);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-black text-blue-500"><Loader2 className="animate-spin w-12 h-12" /></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 font-mono">
            <header className="flex justify-between items-center border-b border-blue-900 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-blue-400">QR TERMINAL 👾</h1>
                    <p className="text-xs text-blue-800">IDENTITY RESOLVED: {identity?.role}</p>
                </div>
                <div className="relative">
                    <ShoppingCart className="w-8 h-8 text-blue-500" />
                    <span className="absolute -top-2 -right-2 bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                        {Array.from(cart.values()).reduce((acc, v) => acc + v.quantity, 0)}
                    </span>
                </div>
            </header>

            {orderStatus === 'success' && activeOrder ? (
                <div className="max-w-md mx-auto bg-slate-900 border-2 border-green-500 p-8 rounded-2xl text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-2xl font-bold">TRANSACTION SUCCESSFUL</h2>
                    <p className="text-sm text-slate-400">Order Reference: {activeOrder.id}</p>
                    <div className="text-4xl font-black">${activeOrder.total_amount}</div>
                    <button onClick={() => setOrderStatus('idle')} className="w-full bg-slate-800 py-3 rounded-xl border border-slate-700">NEW ORDER</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Menu Items */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold border-l-4 border-blue-500 pl-4">MENU_CATALOG</h2>
                        {menuItems.map(item => (
                            <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500 transition-all flex justify-between items-center group">
                                <div>
                                    <h3 className="font-bold text-lg">{item.name || 'Test Item'}</h3>
                                    <p className="text-blue-500 font-mono">${item.price || item.total || 0}</p>
                                </div>
                                <button onClick={() => addToCart(item)} className="bg-blue-600 hover:bg-blue-500 p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">ADD</button>
                            </div>
                        ))}
                    </div>

                    {/* Cart Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit sticky top-6">
                        <h2 className="text-xl font-bold mb-4">EXECUTION_STACK</h2>
                        {cart.size === 0 ? (
                            <p className="text-slate-500 italic text-center py-8">No instructions in queue...</p>
                        ) : (
                            <div className="space-y-4">
                                {Array.from(cart.entries()).map(([id, { item, quantity }]) => (
                                    <div key={id} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                                        <span>{item.name || 'Test Item'} [x{quantity}]</span>
                                        <span className="font-bold">${((item.price || item.total || 0) * quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="pt-4 flex justify-between text-2xl font-black text-blue-400">
                                    <span>TOTAL:</span>
                                    <span>${calculateTotal().toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={placeOrder}
                                    disabled={orderStatus !== 'idle'}
                                    className="w-full bg-blue-600 py-4 rounded-xl font-black tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all"
                                >
                                    {orderStatus === 'idle' ? 'COMMIT TRANSACTION' : 'PROCESSING...'}
                                </button>
                            </div>
                        )}
                        {orderStatus === 'error' && (
                            <div className="mt-4 p-4 bg-red-950 border border-red-500 rounded-xl flex items-center gap-3">
                                <AlertTriangle className="text-red-500" />
                                <p className="text-xs text-red-500">{errorMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const QRMenuPage: React.FC = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return (
        <CARSSProvider terminalType="qr" supabaseUrl={supabaseUrl} supabaseKey={supabaseKey}>
            <QRMenuContent />
        </CARSSProvider>
    );
};

export default QRMenuPage;
