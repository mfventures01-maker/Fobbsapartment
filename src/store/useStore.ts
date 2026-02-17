
import { create } from 'zustand';
import { BookingData, CartItem, MenuItem } from '../types';

interface AppState {
  booking: BookingData;
  setBooking: (booking: Partial<BookingData>) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  orderLocation: string;
  setOrderLocation: (location: string) => void;
}

export const useStore = create<AppState>((set) => ({
  booking: {
    checkIn: '',
    checkOut: '',
    guests: 1,
  },
  setBooking: (data) => set((state) => ({ booking: { ...state.booking, ...data } })),
  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find((i) => i.id === item.id);
    if (existing) {
      return {
        cart: state.cart.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter((i) => i.id !== itemId)
  })),
  updateCartQuantity: (itemId, delta) => set((state) => ({
    cart: state.cart.map((i) => 
      i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    )
  })),
  clearCart: () => set({ cart: [] }),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  orderLocation: 'Main Restaurant',
  setOrderLocation: (location) => set({ orderLocation: location }),
}));
