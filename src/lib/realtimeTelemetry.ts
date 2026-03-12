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

export function subscribeToOperationalTelemetry(locationId: string, callbacks: OperationalCallbacks) {
    if (!locationId) {
        console.warn('[TELEMETRY] Skipping subscription: No Location ID provided.');
        return () => { };
    }

    console.log('[TELEMETRY] Initializing Unified Operational Cockpit for Branch:', locationId);

    const channel = supabase.channel(`carss-ops-${locationId}`);

    // 1. Shift Engine State
    if (callbacks.onShiftUpdate) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "shifts", filter: `branch_id=eq.${locationId}` },
            (payload) => callbacks.onShiftUpdate?.(payload));
    }

    // 2. Verified Revenue Events
    if (callbacks.onTransaction) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `branch_id=eq.${locationId}` },
            (payload) => callbacks.onTransaction?.(payload));
    }

    // 3. Payment Lifecycle
    if (callbacks.onPaymentIntent) {
        channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "payment_intents", filter: `branch_id=eq.${locationId}` },
            (payload) => callbacks.onPaymentIntent?.(payload));
    }

    // 4. Customer Demand Signals
    if (callbacks.onOrder) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `location_id=eq.${locationId}` },
            (payload) => callbacks.onOrder?.(payload));
    }

    // 5. Tasks & Logistics
    channel.on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `branch_id=eq.${locationId}`
    }, (payload) => callbacks.onOrder?.(payload)); // Reusing Order callback for general ops alerts for now

    // 6. System Alerts (Security/Exceptions)
    channel.on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "system_events",
        filter: `metadata->>branch_id=eq.${locationId}`
    }, (payload) => callbacks.onOrder?.(payload));

    // 7. Stock Movement
    if (callbacks.onInventoryChange) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "inventory_logs" },
            (payload) => callbacks.onInventoryChange?.(payload));
    }

    // Activate the observatory
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('[TELEMETRY] Cockpit active. Monitoring Branch:', locationId);
        }
    });

    // Cleanup hook
    return () => {
        console.log('[TELEMETRY] Shutting down branch observatory.');
        supabase.removeChannel(channel);
    };
}
