// 🧬 DETERMINISTIC SHELL PROVIDER V3: SYMMETRICAL INTERFACE
// Purpose: Provide a context-based bridge to the enhanced deterministic mirror.
// Features: Sync Status, Pending Actions, Diff Animations.

'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode, useMemo, useState } from 'react';
import {
    DeterministicShell,
    ShellStateEnhanced,
    TerminalType,
    SystemState,
    OrderStatus,
    KitchenStatus,
    PaymentMethod
} from '@/lib/core/deterministic-shell';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ShellContextValue {
    shell: DeterministicShell | null;
    state: ShellStateEnhanced;
    syncStatus: {
        isHealthy: boolean;
        lag: number;
        pendingCount: number;
        failedCount: number;
    };
    actions: {
        createOrder: (customerName?: string) => Promise<any>;
        addItem: (orderId: string, name: string, price: number, quantity: number) => Promise<any>;
        applyDiscount: (orderId: string, amount: number) => Promise<any>;
        processPayment: (orderId: string, amount: number, method: PaymentMethod) => Promise<any>;
        voidOrder: (orderId: string, reason: string) => Promise<any>;
        updateKitchenStatus: (orderId: string, status: KitchenStatus) => Promise<any>;
        retryFailedActions: () => Promise<void>;
    };
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

// ============================================
// SYNC STATUS BADGE
// ============================================

function SyncStatusBadge({ syncStatus }: { syncStatus: ShellContextValue['syncStatus'] }) {
    if (syncStatus.failedCount > 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-500/30 rounded-full text-red-500 text-[10px] font-black tracking-widest animate-pulse">
                <AlertCircle size={12} /> <span>{syncStatus.failedCount}_DESYNC_FAILURE</span>
            </div>
        );
    }

    if (!syncStatus.isHealthy) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/20 border border-yellow-500/30 rounded-full text-yellow-500 text-[10px] font-black tracking-widest">
                <Loader2 className="animate-spin w-3 h-3" /> <span>SYNCING... {syncStatus.lag}ms</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/20 border border-emerald-500/30 rounded-full text-emerald-500 text-[10px] font-black tracking-widest">
            <Wifi size={12} /> <span>LIVE_MIRROR_PULSE_OK</span>
            {syncStatus.lag > 100 && <span className="text-emerald-800 opacity-60 ml-1">{syncStatus.lag}ms</span>}
        </div>
    );
}

// ============================================
// PROVIDER
// ============================================

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
    const [state, setState] = useState<ShellStateEnhanced>({
        status: 'BOOTING',
        state: null,
        lastSync: null,
        pendingActions: [],
        failedActions: [],
        syncLag: 0
    });

    useEffect(() => {
        const shell = new DeterministicShell(supabaseUrl, supabaseKey, terminalType);
        shellRef.current = shell;

        const unsubscribe = shell.subscribe((newState) => {
            setState(newState);
        });

        shell.startMirroring(branchId).catch((err) => {
            console.error('[CARSS] Mirror initialization failure:', err);
            setState(prev => ({ ...prev, status: 'ERROR', error: err as Error, state: null }));
        });

        return () => {
            unsubscribe();
            shell.stopMirroring();
        };
    }, [terminalType, supabaseUrl, supabaseKey, branchId]);

    const syncStatus = useMemo(() => ({
        isHealthy: state.syncLag < 2000 && state.status === 'MIRRORING',
        lag: state.syncLag,
        pendingCount: state.pendingActions.length,
        failedCount: state.failedActions.length
    }), [state]);

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
        },
        retryFailedActions: async () => {
            if (!shellRef.current) throw new Error('Shell not ready');
            return shellRef.current.retryFailedActions();
        }
    }), []);

    return (
        <ShellContext.Provider value={{ shell: shellRef.current, state, syncStatus, actions }}>
            {/* Sync Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] h-8 bg-slate-950/80 backdrop-blur-md border-b border-blue-900/20 px-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <span className="text-[10px] font-black text-blue-900 italic uppercase">TRUTH_MIRROR_V5</span>
                    <SyncStatusBadge syncStatus={syncStatus} />
                </div>
                {syncStatus.failedCount > 0 && (
                    <button
                        onClick={actions.retryFailedActions}
                        className="pointer-events-auto text-[9px] font-black text-red-500 hover:text-red-400 underline tracking-tighter"
                    >
                        EXECUTE_RETRY_QUEUE
                    </button>
                )}
            </header>
            <div className="pt-8">
                {state.status === 'BOOTING' ? (
                    <div className="min-h-[50vh] flex flex-col items-center justify-center p-20 gap-4 opacity-40">
                        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                        <span className="text-[10px] uppercase font-black tracking-[0.4em]">Establishing_Mirror_Symmetry...</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </ShellContext.Provider>
    );
}

// HOOKS
export function useDeterministicShell() {
    const context = useContext(ShellContext);
    if (!context) throw new Error('useDeterministicShell must be used with a Provider');
    return context;
}

export function useActiveOrders() {
    const { state } = useDeterministicShell();
    return useMemo(() => state.state?.active_orders || [], [state]);
}

export function useKitchenQueue() {
    const { state } = useDeterministicShell();
    return useMemo(() => state.state?.kitchen_queue || [], [state]);
}

export function useInventoryAlerts() {
    const { state } = useDeterministicShell();
    return useMemo(() => state.state?.inventory_alerts || [], [state]);
}

export function useShiftInfo() {
    const { state } = useDeterministicShell();
    return useMemo(() => state.state?.shift || { success: false, cash_balance: 0 }, [state]);
}

// ANIMATION HOOK
export function useOrderAnimation(orderId: string) {
    const { state } = useDeterministicShell();
    const [animation, setAnimation] = useState<'added' | 'updated' | 'removed' | null>(null);

    useEffect(() => {
        // Trigger from diff in state
        if (state.diff?.record_id === orderId) {
            const action = state.diff.action;
            if (action === 'INSERT') setAnimation('added');
            else if (action === 'UPDATE') setAnimation('updated');
            else if (action === 'DELETE') setAnimation('removed');

            const timer = setTimeout(() => setAnimation(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [state.diff, orderId]);

    return animation;
}
