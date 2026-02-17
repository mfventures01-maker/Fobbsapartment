import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, CreditCard, Banknote, Smartphone, Plus, Minus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Assuming UI library or similar

// Mock Items for now since we don't have a guaranteed 'menu' table structure yet
// In production, fetch from 'products' table
const MOCK_ITEMS = [
    { id: '1', name: 'Standard Room', price: 45000, category: 'Accommodation' },
    { id: '2', name: 'Jollof Rice', price: 4500, category: 'Restaurant' },
    { id: '3', name: 'Heineken', price: 1500, category: 'Bar' },
    { id: '4', name: 'Laundry Service', price: 2000, category: 'Services' },
];

const POSPage: React.FC = () => {
    const { cartItems, addToCart, removeFromCart, checkout, total, clearCart } = useCart();
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<'pos' | 'transfer' | 'cash' | null>(null);

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        setIsCheckoutModalOpen(true);
    };

    const confirmPayment = async (method: 'pos' | 'transfer' | 'cash') => {
        setSelectedMethod(method);
        await checkout(method); // Trigger order creation and redirect
        setIsCheckoutModalOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Left: Product Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                        <p className="text-sm text-gray-500">Select items to add to cart</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Category filters could go here */}
                    </div>
                </header>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {MOCK_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => addToCart({ ...item, quantity: 1, department: item.category })}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{item.category}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1 group-hover:text-emerald-600 transition-colors">{item.name}</h3>
                            <p className="text-emerald-600 font-mono font-bold">₦{item.price.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Cart Sidebar */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2 font-bold text-gray-800">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        Current Order
                    </div>
                    <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Clear All
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                            <ShoppingCart className="w-12 h-12" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-500">₦{item.price.toLocaleString()} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-gray-900 text-sm">
                                        ₦{(item.price * item.quantity).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-medium">Total Amount</span>
                        <span className="text-2xl font-black text-gray-900">₦{total.toLocaleString()}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cartItems.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all text-lg flex justify-center items-center gap-2"
                    >
                        Checkout Order
                    </button>
                </div>
            </div>

            {/* Checkout Modal (Simple Overlay) */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Select Payment Method</h2>
                        <p className="text-sm text-gray-500 mb-6">How will this order be settled?</p>

                        <div className="grid grid-cols-1 gap-3 mb-6">
                            <button
                                onClick={() => confirmPayment('pos')}
                                className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-gray-700 group-hover:text-blue-700">POS Terminal</span>
                                </div>
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-blue-500 group-hover:bg-blue-500" />
                            </button>

                            <button
                                onClick={() => confirmPayment('transfer')}
                                className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-gray-700 group-hover:text-purple-700">Bank Transfer</span>
                                </div>
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-purple-500 group-hover:bg-purple-500" />
                            </button>

                            <button
                                onClick={() => confirmPayment('cash')}
                                className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-200">
                                        <Banknote className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-gray-700 group-hover:text-amber-700">Cash Payment</span>
                                </div>
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-amber-500 group-hover:bg-amber-500" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsCheckoutModalOpen(false)}
                            className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POSPage;
