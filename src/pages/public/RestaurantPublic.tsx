import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicRequest } from '@/hooks/usePublicRequest';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildRoomServiceMessage } from '@/lib/channelRouting';
import { callRPC } from '@/lib/rpcClient';
import { createPublicOrder } from '@/services/publicService';
import { Send, ArrowLeft, Plus, Minus, ShoppingBag, User, Phone as PhoneIcon, MapPin, Loader2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { safeNumber } from '@/lib/safeNumber';

const RestaurantPublic: React.FC = () => {
    const { sendRequest } = usePublicRequest();
    const navigate = useNavigate();

    // 🌐 PUBLIC LAYER: Deterministic Menu State
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [menuLoading, setMenuLoading] = useState(true);
    const menuRef = useRef<string>('');

    // Form State (Public)
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [room, setRoom] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [delivery, setDelivery] = useState('Room Delivery');
    const [paymentMethod, setPaymentMethod] = useState('POS on Delivery');
    const [submitting, setSubmitting] = useState(false);

    // Order State
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);

    const loadMenu = useCallback(async () => {
        try {
            // ✅ Step 2: PUBLIC MENU LOADER (No Auth Needed)
            const data = await callRPC<any>('public', 'get_qr_menu', {
                p_location_id: HOTEL_CONFIG.location_id
            });

            if (data?.menu) {
                // 💎 Step 5: DUPLICATION GUARD (Anti-flicker)
                const menuFingerprint = JSON.stringify(data.menu);
                if (menuRef.current !== menuFingerprint) {
                    setMenuItems(data.menu);
                    menuRef.current = menuFingerprint;
                }
            }
        } catch (err: any) {
            console.warn('[QR MENU] Sync Warning:', err.message);
        } finally {
            setMenuLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial load
        loadMenu();

        // ⏱️ Step 2: 5-second public poll (Passive Mirror)
        const interval = setInterval(loadMenu, 5000);
        return () => clearInterval(interval);
    }, [loadMenu]);

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id) {
                const newQ = i.quantity + delta;
                return newQ > 0 ? { ...i, quantity: newQ } : i;
            }
            return i;
        }));
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleSubmit = async (channel: 'whatsapp' | 'telegram' | 'web') => {
        if (cart.length === 0) return;
        if (!name || !phone) {
            alert("Please provide your name and phone number");
            return;
        }

        if (paymentMethod === 'Bill to Room' && !room) {
            alert("Please provide a Room Number for 'Bill to Room' payment.");
            return;
        }

        setSubmitting(true);

        try {
            // 🧱 Determinstic Public Order Gateway
            const gatewayResult = await createPublicOrder(
                HOTEL_CONFIG.org_id,
                HOTEL_CONFIG.location_id,
                cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    qty: item.quantity,
                    price: item.price
                })),
                name,
                phone,
                tableNumber || room || 'N/A',
                {
                    source: 'qr_menu',
                    room_number: room || 'N/A',
                    delivery_method: delivery,
                    notes: notes,
                    payment_method_preference: paymentMethod
                }
            );

            if (!gatewayResult.success) throw new Error(gatewayResult.error || "Order creation failed");

            const orderId = (gatewayResult as any).order_id;

            if (channel !== 'web') {
                sendRequest(
                    'Restaurant Order',
                    buildRoomServiceMessage,
                    {
                        items: cart,
                        subtotal: subtotal,
                        payment_method: paymentMethod,
                        notes: `Name: ${name}, Phone: ${phone}, Room: ${room || 'N/A'}, Table: ${tableNumber || 'N/A'}. Delivery: ${delivery}. ${notes}`,
                        room_number: room || "N/A",
                        summary: `${cart.length} items (₦${safeNumber(subtotal)})`
                    },
                    channel,
                    'kitchen'
                );
            }

            navigate(`/payment-intent?order_id=${orderId}`);
        } catch (err: any) {
            console.error("Submission failed:", err);
            alert("Order failed: " + (err.message || "Unknown error"));
        } finally {
            setSubmitting(false);
        }
    };

    const groupedItems: Record<string, any[]> = {};
    menuItems.forEach((item: any) => {
        if (!groupedItems[item.category]) groupedItems[item.category] = [];
        groupedItems[item.category].push(item);
    });

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {menuLoading && menuItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading Fobbs Menu...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-4 mb-4">
                            <Link to="/" className="p-2 bg-white shadow-sm hover:bg-gray-100 rounded-full">
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </Link>
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-emerald-900 font-serif lowercase">fobbs apartments</h1>
                                <p className="text-emerald-600/60 text-xs font-bold uppercase tracking-widest">public qr menu node</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Menu */}
                            <div className="lg:col-span-2 space-y-8">
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 sticky top-0 bg-gray-50 py-2 z-10">{category}</h2>
                                        <div className="grid gap-4">
                                            {items.map((item: any) => (
                                                <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
                                                    <div>
                                                        <div className="font-black text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">{item.name}</div>
                                                        <div className="text-emerald-700 font-black text-sm">₦{safeNumber(item.price)}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm group-active:scale-95"
                                                    >
                                                        <Plus className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Cart & Checkout */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 sticky top-4">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="font-black text-xl text-gray-900 flex items-center tracking-tighter">
                                            <ShoppingBag className="w-6 h-6 mr-3 text-emerald-600" />
                                            Vault Order
                                        </h3>
                                    </div>

                                    {/* Guest Details */}
                                    <div className="space-y-5 mb-8 pb-8 border-b border-gray-100">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guest Identity *</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-600 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all font-mono"
                                                    placeholder="NAME"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile *</label>
                                                <div className="relative group">
                                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-600 transition-colors" />
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all font-mono"
                                                        placeholder="PHONE"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Room (Opt)</label>
                                                    <input
                                                        type="text"
                                                        value={room}
                                                        onChange={(e) => setRoom(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all font-mono"
                                                        placeholder="RM#"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Table (Opt)</label>
                                                    <input
                                                        type="text"
                                                        value={tableNumber}
                                                        onChange={(e) => setTableNumber(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all font-mono"
                                                        placeholder="TBL#"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {cart.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <ShoppingBag className="w-6 h-6 text-gray-200" />
                                            </div>
                                            <p className="text-gray-300 text-xs font-black uppercase tracking-widest">Vault Empty</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {cart.map((item: any) => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm animate-in fade-in slide-in-from-right-2">
                                                        <div className="flex-1 pr-4">
                                                            <div className="font-black text-gray-900 text-[13px]">{item.name}</div>
                                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">₦{safeNumber(item.price)}</div>
                                                        </div>
                                                        <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"><Minus className="w-3 h-3" /></button>
                                                            <span className="font-black w-6 text-center text-gray-900 text-xs">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                                                <div className="flex justify-between items-center text-emerald-900">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Bill</span>
                                                    <span className="text-2xl font-black tabular-nums tracking-tighter">₦{safeNumber(subtotal)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Delivery Point</label>
                                                    <select
                                                        value={delivery}
                                                        onChange={(e) => setDelivery(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-xs font-black text-gray-900 appearance-none transition-all uppercase tracking-widest cursor-pointer"
                                                    >
                                                        <option value="Room Delivery">Room Delivery</option>
                                                        <option value="Dine In">Dine In (Table)</option>
                                                        <option value="Pickup">Pickup at Restaurant</option>
                                                    </select>
                                                </div>

                                                <div className="group">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Payment Method</label>
                                                    <select
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-xs font-black text-gray-900 appearance-none transition-all uppercase tracking-widest cursor-pointer"
                                                    >
                                                        <option value="POS on Delivery">POS on Delivery</option>
                                                        <option value="Transfer">Bank Transfer</option>
                                                        <option value="Cash">Cash Payment</option>
                                                        <option value="Bill to Room">Bill to Room</option>
                                                    </select>
                                                </div>

                                                <div className="group">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Special Directives</label>
                                                    <textarea
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-xs font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                                        placeholder="Allergies, timing, etc..."
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <button
                                                    onClick={() => handleSubmit('web')}
                                                    disabled={submitting}
                                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-3"
                                                >
                                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                                                    Submit to Kitchen
                                                </button>
                                                <button
                                                    onClick={() => handleSubmit('whatsapp')}
                                                    disabled={submitting}
                                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 disabled:opacity-50 flex items-center justify-center gap-3"
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Orders on Whatsapp
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};

export default RestaurantPublic;
