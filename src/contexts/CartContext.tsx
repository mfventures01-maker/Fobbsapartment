import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
    const { profile } = useAuth();
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
            // 1. Create Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    total_amount: total,
                    status: 'pending', // Pending payment
                    payment_method: paymentMethod, // Selected upfront
                    created_at: new Date().toISOString(),
                    // Assuming profile has business_id or similar, but for now generic insert
                    // staff_id: profile?.id 
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items (Optional but good practice)
            const orderItems = cartItems.map(item => ({
                order_id: orderData.id,
                item_name: item.name,
                unit_price: item.price,
                quantity: item.quantity,
                total_price: item.price * item.quantity
            }));

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
