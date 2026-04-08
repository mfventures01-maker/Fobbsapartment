import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShoppingBag, Plus, Minus, Send, Phone as PhoneIcon, User, Loader2 } from 'lucide-react';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTcn9LO3erasQw7UWJK_eAf3WgcFyeI40JmmVLC_B2ZrUpolST2ENZDZkMyB7YfT9D/exec";

interface MenuItem {
    id?: string;
    name: string;
    price: number;
    category?: string;
    image_url?: string;
    description?: string;
}

export default function RestaurantMenu() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<{ item: MenuItem, qty: number }[]>([]);

    // Customer Details
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    // Automatically retrieve location from LocationRouter session
    const locationContext = sessionStorage.getItem('qr_location_id') || 'Walk-in';

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                // 1. Aggressive Caching (Offline First)
                const cached = sessionStorage.getItem('gas_food_menu');
                if (cached) {
                    setMenu(JSON.parse(cached));
                    setLoading(false);
                }

                // 2. Fetch from App Script
                const res = await fetch(SCRIPT_URL);
                const data = await res.json();

                // Assuming GAS returns { items: [{...}] } or direct array
                const items = Array.isArray(data) ? data : data.items || [];
                setMenu(items);
                sessionStorage.setItem('gas_food_menu', JSON.stringify(items));
            } catch (err) {
                if (menu.length === 0) {
                    toast.error("Failed to load menu. Check your connection.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();

        const savedCart = localStorage.getItem('carss_food_cart');
        if (savedCart) {
            try { setCart(JSON.parse(savedCart)); } catch (e) { }
        }
    }, []);

    const updateQty = (item: MenuItem, delta: number) => {
        setCart(prev => {
            let newCart = prev;
            const existing = prev.find(c => c.item.name === item.name);
            if (existing) {
                const newQty = existing.qty + delta;
                if (newQty <= 0) newCart = prev.filter(c => c.item.name !== item.name);
                else newCart = prev.map(c => c.item.name === item.name ? { ...c, qty: newQty } : c);
            } else if (delta > 0) {
                newCart = [...prev, { item, qty: 1 }];
            }
            localStorage.setItem('carss_food_cart', JSON.stringify(newCart));
            return newCart;
        });
    };

    const total = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);

    const handleShare = (platform: 'whatsapp' | 'telegram') => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!name || !phone) return toast.error("Please provide name and phone");

        const itemsText = cart.map(c => `${c.item.name} x${c.qty}`).join(', ');

        // Final message template matches exact requirements
        const text = `📍 Fobbs Apartments
🏷️ Department: Restaurant
🪑 Location: ${locationContext}
👤 Guest: ${name} (${phone})
🧾 Order: ${itemsText}
💰 Total: ₦${total.toLocaleString()}
📌 Payment on delivery / Cash at table`;

        const targetNumber = "2347048033575"; // From prompt
        const encoded = encodeURIComponent(text);

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/${targetNumber}?text=${encoded}`, '_blank');
        } else {
            window.open(`https://t.me/Captlee77?text=${encoded}`, '_blank');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center p-12 text-emerald-600 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="font-bold">Loading Food Menu...</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Menu List */}
            <div className="lg:col-span-2 space-y-4">
                {menu.length === 0 && !loading && (
                    <div className="text-center p-8 bg-white rounded-xl text-gray-500 shadow-sm">
                        Menu is currently unavailable.
                    </div>
                )}
                {menu.map((item, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex shadow-sm hover:shadow-md transition-shadow gap-4">
                        {item.image_url && (
                            <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="font-bold text-gray-900">{item.name}</div>
                            {item.description && <div className="text-gray-500 text-xs mb-1 line-clamp-2">{item.description}</div>}
                            <div className="text-emerald-700 font-medium">₦{Number(item.price).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center space-x-3 bg-emerald-50 rounded-full px-2 h-10 self-center shrink-0">
                            <button onClick={() => updateQty(item, -1)} className="p-1 text-emerald-600 hover:bg-emerald-200 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold text-sm w-4 text-center text-emerald-900">{cart.find(c => c.item.name === item.name)?.qty || 0}</span>
                            <button onClick={() => updateQty(item, 1)} className="p-1 text-emerald-600 hover:bg-emerald-200 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cart Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-4 h-fit">
                <h3 className="font-bold text-lg flex items-center mb-6 text-gray-900">
                    <ShoppingBag className="w-5 h-5 mr-2" /> Checkout
                </h3>

                {/* Guest Details */}
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Phone *</label>
                        <div className="relative">
                            <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="tel" placeholder="080..." value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" />
                        </div>
                    </div>
                </div>

                <div className="border-b border-dashed border-gray-200 pb-4 mb-4 font-bold flex justify-between text-lg text-emerald-900">
                    <span>Total</span>
                    <span>₦{total.toLocaleString()}</span>
                </div>

                <div className="space-y-3">
                    <button onClick={() => handleShare('whatsapp')} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#20bd5a] shadow-lg shadow-green-100 transition-colors">
                        <Send className="w-4 h-4" /> Send via WhatsApp
                    </button>
                    <button onClick={() => handleShare('telegram')} className="w-full py-3 bg-[#0088cc] text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#0077b5] shadow-lg shadow-blue-100 transition-colors">
                        <Send className="w-4 h-4" /> Send via Telegram
                    </button>
                </div>
            </div>
        </div>
    );
}
