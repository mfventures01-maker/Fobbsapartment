import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useShiftState } from './ShiftContext';
import { getActiveShift } from '@/lib/shiftService';

import { SHIFT_STATUS } from '../constants/shiftStatus';

export interface CartItem {
    id: string; // product_id or unique item ID
    name: string;
    price: number;
    quantity: number;
    department: string;
}

export interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    checkout: (paymentMethod: 'pos' | 'transfer' | 'cash') => Promise<void>;
    total: number;
    isCheckingOut: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const { shiftState } = useShiftState();
    const navigate = useNavigate();

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addToCart = (item: CartItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        toast.success(`Added ${item.name} to cart`);
    };

    const removeFromCart = (itemId: string) => {
        setCartItems(prev => prev.filter(i => i.id !== itemId));
    };

    const clearCart = () => setCartItems([]);

    const checkout = async (paymentMethod: 'pos' | 'transfer' | 'cash') => {
        if (cartItems.length === 0) {
            toast.error("Cart is empty!");
            return;
        }

        setIsCheckingOut(true);
        try {
            // STEP 4 — TERMINAL LOCK GUARD
            // Check in-memory state first for speed
            if (shiftState.status !== SHIFT_STATUS.OPEN) {
                toast.error("NO ACTIVE SHIFT: Access Denied. Please start a shift before processing sales.");
                throw new Error("No active shift");
            }

            // Dual probe: Verify with DB (Anti-Gravity Rule)
            const activeShift = await getActiveShift(shiftState.shift.staff_id);
            if (!activeShift || activeShift.id !== shiftState.shift.id) {
                toast.error("SHIFT DESYNC: Your active shift session has expired or changed.");
                throw new Error("Shift desync");
            }

            // 1. Create Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    total_amount: total,
                    status: 'pending', // Pending payment
                    payment_method: paymentMethod,
                    staff_id: activeShift.staff_id,
                    shift_id: activeShift.id, // Link to shift for reconciliation
                    business_id: activeShift.business_id,
                    branch_id: activeShift.branch_id,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // STEP 4 — PAYMENT INTENT PIPELINE
            const { error: intentError } = await supabase
                .from('payment_intents')
                .insert({
                    order_id: orderData.id,
                    business_id: activeShift.business_id,
                    branch_id: activeShift.branch_id,
                    staff_id: activeShift.staff_id,
                    shift_id: activeShift.id,
                    expected_amount: total,
                    payment_type: paymentMethod,
                    status: 'pending'
                });

            if (intentError) throw intentError;

            // 2. Create Order Items (Optional but good practice)
            /* 
            const orderItems = cartItems.map(item => ({
                order_id: orderData.id,
                item_name: item.name,
                unit_price: item.price,
                quantity: item.quantity,
                total_price: item.price * item.quantity
            }));
            */

            // If order_items table exists:
            // await supabase.from('order_items').insert(orderItems);

            toast.success("Order Created! Proceeding to Payment...");

            // 3. Clear Cart
            clearCart();

            // 4. Redirect to Payment Intent Page
            navigate(`/payment-intent?orderId=${orderData.id}`);

        } catch (error: any) {
            console.error("Checkout Failed:", error);
            toast.error("Checkout Failed: " + error.message);
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, checkout, total, isCheckingOut }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};
