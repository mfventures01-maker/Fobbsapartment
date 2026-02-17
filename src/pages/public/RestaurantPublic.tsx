import React, { useState } from 'react';
import { usePublicRequest } from '@/hooks/usePublicRequest';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildRoomServiceMessage } from '@/lib/channelRouting';
import { Send, ArrowLeft, Plus, Minus, ShoppingBag, User, Phone as PhoneIcon, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const RestaurantPublic: React.FC = () => {
    const { sendRequest } = usePublicRequest();

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [room, setRoom] = useState('');

    // Order State
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [notes, setNotes] = useState('');
    const [delivery, setDelivery] = useState('Room Delivery');
    const [paymentMethod, setPaymentMethod] = useState('POS on Delivery');

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
        if (!name || !phone) {
            alert("Please provide your name and phone number");
            return;
        }

        sendRequest(
            'Restaurant Order',
            buildRoomServiceMessage,
            {
                items: cart,
                subtotal: subtotal,
                payment_method: paymentMethod,
                notes: `Name: ${name}, Phone: ${phone}, Room: ${room || 'N/A'}. Delivery: ${delivery}. ${notes}`,
                room_number: room || "N/A",
                summary: `${cart.length} items (₦${subtotal.toLocaleString()})`
            },
            channel,
            'kitchen'
        );
    };

    const groupedItems = HOTEL_CONFIG.hotel.room_service.menu.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, typeof HOTEL_CONFIG.hotel.room_service.menu>);

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
                                    {items.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-emerald-700 font-medium">₦{item.price.toLocaleString()}</div>
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
                                </div>
                            </div>

                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Your cart is empty.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-gray-500">₦{item.price.toLocaleString()} x {item.quantity}</div>
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
                                            <span>₦{subtotal.toLocaleString()}</span>
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
                                            onClick={() => handleSubmit('whatsapp')}
                                            className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2 shadow-lg shadow-green-100"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Order on WhatsApp</span>
                                        </button>
                                        {HOTEL_CONFIG.channels.telegram_handle && (
                                            <button
                                                onClick={() => handleSubmit('telegram')}
                                                className="w-full py-3 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0077b5] flex items-center justify-center space-x-2 shadow-lg shadow-blue-100"
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
        </div>
    );
};

export default RestaurantPublic;
