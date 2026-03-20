

export interface OperationalCallbacks {
    onShiftUpdate?: (payload: any) => void;
    onTransaction?: (payload: any) => void;
    onPaymentIntent?: (payload: any) => void;
    onOrder?: (payload: any) => void;
    onInventoryChange?: (payload: any) => void;
    onShiftDeclaration?: (payload: any) => void;
    onAuditLog?: (payload: any) => void;
}

export function subscribeToOperationalTelemetry(locationId: string, _callbacks: OperationalCallbacks) {
    if (!locationId) return () => { };

    console.warn(`[ANTI-GRAVITY] Realtime Gateway for branch ${locationId} has been suspended (Purification Protocol Step 3). Switching to RPC Deterministic Hearts.`);

    // ✅ Realtime is strictly controlled/disabled to prevent Authority Collapse
    // System now relies on useSystemState heartbeat.

    return () => {
        // No-op cleanup
    };
}
