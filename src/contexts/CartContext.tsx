import React, { createContext, useContext, useState } from 'react';

import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useShiftState } from './ShiftContext';
import { getActiveShift } from '@/lib/shiftService';
import { createOrderGateway } from '@/services/orderService';

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

            // 1. Map items
            const orderItems = cartItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            // 2. Create Order via Gateway
            const gatewayResult = await createOrderGateway(
                orderItems,
                'cart_checkout',
                activeShift.business_id,
                activeShift.branch_id,
                activeShift.staff_id,
                undefined,
                'Walk-In',
                undefined,
                { paymentMethod }
            );

            toast.success("Order Created! Proceeding to Payment...");

            // 3. Clear Cart
            clearCart();

            // 4. Redirect to Payment Intent Page
            navigate(`/payment-intent?orderId=${gatewayResult.order_id}`);

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
