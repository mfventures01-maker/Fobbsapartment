import React, { useState } from 'react';
import { usePublicRequest } from '@/hooks/usePublicRequest';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildRoomServiceMessage } from '@/lib/channelRouting';
import { supabase } from '@/lib/supabaseClient';
import { createPublicOrder } from '@/services/publicService';
import { Send, ArrowLeft, Plus, Minus, ShoppingBag, User, Phone as PhoneIcon, MapPin, Loader2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { safeNumber } from '@/lib/safeNumber';

const RestaurantPublic: React.FC = () => {
    const { sendRequest } = usePublicRequest();
    const navigate = useNavigate();

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [room, setRoom] = useState('');

    // Order State
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [notes, setNotes] = useState('');
    const [delivery, setDelivery] = useState('Room Delivery');
    const [paymentMethod, setPaymentMethod] = useState('POS on Delivery');
    const [tableNumber, setTableNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    let subtotal = 0;
    cart.forEach(item => { subtotal += (item.price * item.quantity); });

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
            if (!supabase) throw new Error("Database client not available");

            // 1. Create Order via Universal Gateway (Deterministic Alignment)
            const gatewayResult = await createPublicOrder(
                HOTEL_CONFIG.org_id,
                HOTEL_CONFIG.location_id,
                cart.map(item => ({
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

            if (!gatewayResult.success) throw new Error(gatewayResult.error || "Failed to create order");

            const orderId = gatewayResult.order_id;

            // 3. Optional: WhatsApp Notification (Background)
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

            // 4. Redirect to Payment Intent
            navigate(`/payment-intent?order_id=${orderId}`);

        } catch (err: any) {
            console.error("Submission failed:", err);
            alert("Failed to submit order: " + (err.message || "Unknown error"));
        } finally {
            setSubmitting(false);
        }
    };

    const groupedItems: Record<string, any[]> = {};
    HOTEL_CONFIG.hotel.room_service.menu.forEach((item: any) => {
        if (!groupedItems[item.category]) groupedItems[item.category] = [];
        groupedItems[item.category].push(item);
    });

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-4">
                    <Link to="/" className="p-2 bg-white shadow-sm hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-emerald-900 font-serif">Fobbs Restaurant</h1>
                        <p className="text-gray-500 text-sm">Fine Dining & Room Service</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Menu */}
                    <div className="lg:col-span-2 space-y-8">
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category}>
                                <h2 className="text-xl font-bold text-gray-800 mb-4 sticky top-0 bg-gray-50 py-2 z-10">{category}</h2>
                                <div className="grid gap-4">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-emerald-700 font-medium">₦{safeNumber(item.price)}</div>
                                            </div>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cart & Checkout */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center mb-6">
                                <ShoppingBag className="w-5 h-5 mr-2" /> Your Order
                            </h3>

                            {/* Guest Details */}
                            <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Phone *</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-8 p-2 bg-gray-50 rounded-lg text-sm"
                                                placeholder="080..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Room (Opt)</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                            <input
                                                type="text"
                                                value={room}
                                                onChange={(e) => setRoom(e.target.value)}
                                                className="w-full pl-8 p-2 bg-gray-50 rounded-lg text-sm"
                                                placeholder="Rm #"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Table (Opt)</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                            <input
                                                type="text"
                                                value={tableNumber}
                                                onChange={(e) => setTableNumber(e.target.value)}
                                                className="w-full pl-8 p-2 bg-gray-50 rounded-lg text-sm"
                                                placeholder="Table #"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Your cart is empty.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {cart.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-gray-500">₦{safeNumber(item.price)} x {item.quantity}</div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Minus className="w-3 h-3" /></button>
                                                    <span className="font-medium w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Plus className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 pt-4">
                                        <div className="flex justify-between items-center font-bold text-lg text-emerald-900">
                                            <span>Total</span>
                                            <span>₦{safeNumber(subtotal)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Delivery</label>
                                            <select
                                                value={delivery}
                                                onChange={(e) => setDelivery(e.target.value)}
                                                className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                            >
                                                <option value="Room Delivery">Room Delivery</option>
                                                <option value="Dine In">Dine In (Table)</option>
                                                <option value="Pickup">Pickup at Restaurant</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Payment</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                            >
                                                <option value="POS on Delivery">POS on Delivery</option>
                                                <option value="Transfer">Transfer</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Bill to Room">Bill to Room</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                                placeholder="Short note..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <button
                                            onClick={() => handleSubmit('web')}
                                            disabled={submitting}
                                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                                            <span>Order on Web</span>
                                        </button>
                                        <button
                                            onClick={() => handleSubmit('whatsapp')}
                                            disabled={submitting}
                                            className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2 shadow-lg shadow-green-100 disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Order on WhatsApp</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantPublic;
