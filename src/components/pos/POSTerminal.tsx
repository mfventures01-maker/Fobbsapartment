import React, { useState, useMemo } from 'react';
import {
    ShoppingCart, Plus, Minus, Trash2, CreditCard,
    Banknote, ArrowRight, Search,
    Utensils, Wine, Package
} from 'lucide-react';
import { HOTEL_CONFIG, MenuItem } from '@/config/cars.config';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { createStaffOrder } from '@/services/orderService';
import { confirmPaymentIntent } from '@/services/paymentService';
import toast from 'react-hot-toast';
import { safeNumber } from '@/lib/safeNumber';

interface CartItem extends MenuItem {
    quantity: number;
}

interface POSTerminalProps {
    department: 'Restaurant' | 'Bar' | 'Generic';
}

const POSTerminal: React.FC<POSTerminalProps> = ({ department }) => {
    const { authority } = useAuth();
    const { shiftState } = useShiftState();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [category, setCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [customerName, setCustomerName] = useState('');

    // 1. Get Menu based on Department
    const menuItems = useMemo(() => {
        if (department === 'Bar') return HOTEL_CONFIG.hotel.bar.menu;
        return HOTEL_CONFIG.hotel.room_service.menu;
    }, [department]);

    // 2. Filter Logic
    const categories = useMemo(() => ['All', ...new Set(menuItems.map(i => i.category))], [menuItems]);

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = category === 'All' || item.category === category;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [menuItems, category, searchQuery]);

    // 3. Cart Actions
    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const newQ = i.quantity + delta;
                return newQ > 0 ? { ...i, quantity: newQ } : i;
            }
            return i;
        }));
    };

    const subtotal = useMemo(() => {
        let sum = 0;
        cart.forEach(i => { sum += (i.price * i.quantity); });
        return sum;
    }, [cart]);

    // 4. Checkout Logic
    const handleCheckout = async (paymentType: 'cash' | 'pos' | 'transfer') => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        if (shiftState.status !== 'open') {
            toast.error('No active shift. Terminal locked.');
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading(`Processing ${paymentType} payment...`);

        try {
            const items = cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }));

            const orderGatewayResult = await createStaffOrder(
                authority.businessId!,
                authority.branchId!,
                items,
                { department: department, customer_name: customerName || 'Walk-in Guest' }
            );

            // D. Handle Instant Confirmation for Cash/POS
            if (paymentType === 'cash' || paymentType === 'pos') {
                const confirmData = await confirmPaymentIntent(
                    orderGatewayResult.payment_intent_id,
                    paymentType === 'pos' ? `POS-${Date.now()}` : undefined
                );

                if (!confirmData.success) throw new Error(confirmData.error || 'Confirmation failed');

                toast.success('Transaction Completed', { id: loadingToast });
            } else {
                // Transfer stays pending for manager
                toast.success('Transfer Recorded - Awaiting Manager', { id: loadingToast });
            }

            // Reset UI
            setCart([]);
            setCustomerName('');
            setSearchQuery('');

        } catch (err: any) {
            console.error('POS Error:', err);
            toast.error(err.message || 'Checkout failed', { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex h-[85vh] gap-6 overflow-hidden">
            {/* Left Side: Product Grid */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {/* Search & Categories */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === cat
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 scrollbar-thin">
                    {filteredItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left flex flex-col justify-between group active:scale-95"
                        >
                            <div className="mb-4">
                                <div className="p-2 bg-slate-50 rounded-xl w-fit group-hover:bg-emerald-50 transition-colors mb-2 text-slate-400 group-hover:text-emerald-600">
                                    {department === 'Bar' ? <Wine className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-emerald-950">{item.name}</h3>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">{item.category}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-emerald-700">₦{safeNumber(item.price)}</span>
                                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: Cart & Checkout */}
            <div className="w-full max-w-[400px] flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-emerald-600" />
                            Active Cart
                        </h2>
                        <span className="text-slate-400 text-xs font-medium">{cart.length} items selected</span>
                    </div>
                    <button
                        onClick={() => setCart([])}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Clear Cart"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-50 group hover:border-slate-200 transition-all">
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm leading-none mb-1">{item.name}</h4>
                                <p className="text-[10px] font-bold text-emerald-600">₦{safeNumber(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:border-orange-200 hover:text-orange-600">
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-black text-slate-900 text-sm w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:border-emerald-200 hover:text-emerald-600">
                                    <Plus className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="ml-2 text-rose-300 hover:text-rose-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20">
                            <Package className="w-16 h-16 text-slate-100 mb-4" />
                            <p className="text-slate-400 font-medium">Cart is empty</p>
                        </div>
                    )}
                </div>

                {/* Checkout Panel */}
                <div className="p-8 bg-slate-900 text-white space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center opacity-60">
                            <span className="text-xs uppercase font-black tracking-widest">Subtotal</span>
                            <span className="font-mono">₦{safeNumber(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-black">
                            <span>TOTAL</span>
                            <span className="text-emerald-400 font-mono text-2xl">₦{safeNumber(subtotal)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Guest Name (Optional)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleCheckout('cash')}
                                disabled={isProcessing || cart.length === 0}
                                className="flex items-center justify-center gap-2 bg-emerald-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50"
                            >
                                <Banknote className="w-4 h-4" />
                                Cash
                            </button>
                            <button
                                onClick={() => handleCheckout('pos')}
                                disabled={isProcessing || cart.length === 0}
                                className="flex items-center justify-center gap-2 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4" />
                                POS
                            </button>
                        </div>

                        <button
                            onClick={() => handleCheckout('transfer')}
                            disabled={isProcessing || cart.length === 0}
                            className="w-full flex items-center justify-center gap-2 bg-slate-700/50 border border-slate-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Bank Transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSTerminal;
