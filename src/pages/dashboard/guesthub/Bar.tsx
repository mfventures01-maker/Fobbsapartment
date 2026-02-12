import React, { useState } from 'react';
import { useGuestHubRequest } from './useGuestHub';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildBarOrderMessage } from '@/lib/channelRouting';
import { Send, ArrowLeft, Plus, Minus, Wine } from 'lucide-react';
import { Link } from 'react-router-dom';

const Bar: React.FC = () => {
    const { sendRequest } = useGuestHubRequest();
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [notes, setNotes] = useState('');
    const [delivery, setDelivery] = useState('Room Delivery');
    const [paymentMethod, setPaymentMethod] = useState('Bill to Room');

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
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

    const handleSubmit = (channel: 'whatsapp' | 'telegram') => {
        if (cart.length === 0) return;
        sendRequest(
            'BAR_ORDER',
            'Bar Request',
            buildBarOrderMessage,
            {
                items: cart,
                subtotal: subtotal,
                payment_method: paymentMethod,
                notes: `Delivery: ${delivery}. ${notes}`,
                summary: `${cart.length} drinks (₦${subtotal.toLocaleString()})`
            },
            channel,
            'kitchen' // Or bar if we had a specific routing key, kitchen handles F&B usually
        );
    };

    // Use bar menu if available, otherwise just show empty state or fallback
    // We added bar menu to config in previous steps.
    // Casting as any because TS might not pick up the update immediately without a full project server restart/check
    const barMenu = (HOTEL_CONFIG.hotel as any).bar?.menu || [];

    const groupedItems = barMenu.reduce((acc: any, item: any) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 mb-8">
                <Link to="/dashboard/guest-hub" className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Bar & Drinks</h1>
                    <p className="text-gray-500 text-sm">Sample Bar Menu (editable)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Menu */}
                <div className="lg:col-span-2 space-y-8">
                    {barMenu.length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-200">
                            <Wine className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Menu updating...</h3>
                            <p className="text-gray-500">Please check back later or call front desk.</p>
                        </div>
                    ) : (
                        Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                            <div key={category}>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">{category}</h2>
                                <div className="grid gap-4">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                                            <div>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-emerald-700 font-medium">₦{item.price.toLocaleString()}</div>
                                            </div>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="p-2 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center">
                                <Wine className="w-5 h-5 mr-2" /> Your Order
                            </h3>
                            <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-bold text-gray-600">{cart.length} items</span>
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                Your cart is empty.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                <div className="text-gray-500">₦{item.price.toLocaleString()} x {item.quantity}</div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                                                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-500 ml-1"><small>x</small></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center font-bold text-lg">
                                        <span>Total</span>
                                        <span>₦{subtotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Delivery</label>
                                    <select
                                        value={delivery}
                                        onChange={(e) => setDelivery(e.target.value)}
                                        className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                    >
                                        <option value="Room Delivery">Room Delivery</option>
                                        <option value="Pickup">Pickup at Bar</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                    >
                                        <option value="Bill to Room">Bill to Room</option>
                                        <option value="POS on Delivery">POS on Delivery</option>
                                        <option value="Transfer">Transfer</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full text-sm p-2 bg-gray-50 rounded-lg"
                                        placeholder="Specific brand preference, ice, etc."
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={() => handleSubmit('whatsapp')}
                                        className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Order on WhatsApp</span>
                                    </button>
                                    {HOTEL_CONFIG.channels.telegram_handle && (
                                        <button
                                            onClick={() => handleSubmit('telegram')}
                                            className="w-full py-3 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0077b5] flex items-center justify-center space-x-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Order on Telegram</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Bar;
