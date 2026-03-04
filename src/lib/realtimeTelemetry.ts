import { supabase } from './supabaseClient';

export function subscribeToShiftTelemetry(onUpdate: () => void) {
    const channel = supabase
        .channel("shift-telemetry")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "shifts"
            },
            () => {
                onUpdate()
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
