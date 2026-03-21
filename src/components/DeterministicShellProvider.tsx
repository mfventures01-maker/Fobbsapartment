// 🧬 DETERMINISTIC SHELL PROVIDER V2: SYMMETRICAL INTERFACE
// Purpose: Provide a context-based bridge to the deterministic mirror.
// Law: No business state storage in React - ONLY mirroring.

'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode, useMemo, useState } from 'react';
import {
    DeterministicShell,
    ShellState,
    TerminalType,
    SystemState,
    OrderStatus,
    KitchenStatus,
    PaymentMethod
} from '@/lib/core/deterministic-shell';

interface ShellContextValue {
    shell: DeterministicShell | null;
    state: ShellState;
    actions: {
        createOrder: (customerName?: string) => Promise<any>;
        addItem: (orderId: string, name: string, price: number, quantity: number) => Promise<any>;
        applyDiscount: (orderId: string, amount: number) => Promise<any>;
        processPayment: (orderId: string, amount: number, method: PaymentMethod) => Promise<any>;
        voidOrder: (orderId: string, reason: string) => Promise<any>;
        updateKitchenStatus: (orderId: string, status: KitchenStatus) => Promise<any>;
    };
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

interface DeterministicShellProviderProps {
    children: ReactNode;
    terminalType: TerminalType;
    supabaseUrl: string;
    supabaseKey: string;
    branchId?: string;
}

export function DeterministicShellProvider({
    children,
    terminalType,
    supabaseUrl,
    supabaseKey,
    branchId
}: DeterministicShellProviderProps) {
    const shellRef = useRef<DeterministicShell | null>(null);
    const [state, setState] = useState<ShellState>({ status: 'BOOTING', reason: 'Initializing State Mirror' });

    useEffect(() => {
        const shell = new DeterministicShell(supabaseUrl, supabaseKey, terminalType);
        shellRef.current = shell;

        const unsubscribe = shell.subscribe((newState) => {
            setState(newState);
        });

        shell.startMirroring(branchId).catch((err) => {
            console.error('[CARSS] Mirror initialization failure:', err);
            setState({ status: 'ERROR', error: err as Error, state: null });
        });

        return () => {
            unsubscribe();
            shell.stopMirroring();
        };
    }, [terminalType, supabaseUrl, supabaseKey, branchId]);

    const actions = useMemo(() => ({
        createOrder: async (customerName?: string) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.createOrder(customerName);
        },
        addItem: async (orderId: string, name: string, price: number, quantity: number) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.addItem(orderId, name, price, quantity);
        },
        applyDiscount: async (orderId: string, amount: number) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.transmit('apply_discount', { p_order_id: orderId, p_amount: amount });
        },
        processPayment: async (orderId: string, amount: number, method: PaymentMethod) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.processPayment(orderId, amount, method);
        },
        voidOrder: async (orderId: string, reason: string) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.transmit('void_order', { p_order_id: orderId, p_reason: reason });
        },
        updateKitchenStatus: async (orderId: string, status: KitchenStatus) => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.updateKitchenStatus(orderId, status);
        }
    }), []);

    return (
        <ShellContext.Provider value={{ shell: shellRef.current, state, actions }}>
            {children}
        </ShellContext.Provider>
    );
}

// HOOKS
export function useDeterministicShell() {
    const context = useContext(ShellContext);
    if (!context) throw new Error('useDeterministicShell must be used with a Provider');
    return context;
}

// DERIVED STATE HOOKS (MEMOIZED)
export function useActiveOrders() {
    const { state } = useDeterministicShell();
    return useMemo(() => {
        if (state.status !== 'MIRRORING') return [];
        return state.state.active_orders;
    }, [state]);
}

export function useKitchenQueue() {
    const { state } = useDeterministicShell();
    return useMemo(() => {
        if (state.status !== 'MIRRORING') return [];
        return state.state.kitchen_queue;
    }, [state]);
}

export function useInventoryAlerts() {
    const { state } = useDeterministicShell();
    return useMemo(() => {
        if (state.status !== 'MIRRORING') return [];
        return state.state.inventory_alerts;
    }, [state]);
}

export function useShiftInfo() {
    const { state } = useDeterministicShell();
    return useMemo(() => {
        if (state.status !== 'MIRRORING') return { success: false, cash_balance: 0 };
        return state.state.shift;
    }, [state]);
}
