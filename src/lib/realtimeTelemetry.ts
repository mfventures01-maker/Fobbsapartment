import { supabase } from './supabaseClient';

export interface OperationalCallbacks {
    onShiftUpdate?: (payload: any) => void;
    onTransaction?: (payload: any) => void;
    onPaymentIntent?: (payload: any) => void;
    onOrder?: (payload: any) => void;
    onInventoryChange?: (payload: any) => void;
    onShiftDeclaration?: (payload: any) => void;
    onAuditLog?: (payload: any) => void;
}

export function subscribeToOperationalTelemetry(callbacks: OperationalCallbacks) {
    console.log('[TELEMETRY] Initializing Unified Operational Cockpit...');

    const channel = supabase.channel("carss-ops");

    // 1. Shift Engine State
    if (callbacks.onShiftUpdate) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "shifts" },
            (payload) => callbacks.onShiftUpdate?.(payload));
    }

    // 2. Verified Revenue Events
    if (callbacks.onTransaction) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" },
            (payload) => callbacks.onTransaction?.(payload));
    }

    // 3. Payment Lifecycle
    if (callbacks.onPaymentIntent) {
        channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "payment_intents" },
            (payload) => callbacks.onPaymentIntent?.(payload));
    }

    // 4. Customer Demand Signals
    if (callbacks.onOrder) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
            (payload) => callbacks.onOrder?.(payload));
    }

    // 5. Stock Movement
    if (callbacks.onInventoryChange) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "inventory_logs" },
            (payload) => callbacks.onInventoryChange?.(payload));
    }

    // 6. Staff Settlement Events
    if (callbacks.onShiftDeclaration) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "shift_declarations" },
            (payload) => callbacks.onShiftDeclaration?.(payload));
    }

    // 7. Security / Administrative Actions
    if (callbacks.onAuditLog) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" },
            (payload) => callbacks.onAuditLog?.(payload));
    }

    // Activate the observatory
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('[TELEMETRY] Cockpit active. Observing CARSS operations...');
        }
    });

    // Cleanup hook
    return () => {
        console.log('[TELEMETRY] Shutting down observatory channel.');
        supabase.removeChannel(channel);
    };
}
