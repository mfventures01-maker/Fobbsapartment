import { supabase } from './supabaseClient';
import { useSystemStore } from '../store/systemStore';
import { HOTEL_CONFIG } from '../config/cars.config';

let hydrateTimer: NodeJS.Timeout | null = null;

export function scheduleHydrate() {
    if (hydrateTimer) return;

    hydrateTimer = setTimeout(() => {
        useSystemStore.getState().hydrate(HOTEL_CONFIG.org_id);
        hydrateTimer = null;
    }, 300);
}

export function setupTelemetry() {
    console.log('[TELEMETRY] Booting Global System State Engine (SSSE)...');

    const channel = supabase
        .channel('carss-global-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_events' }, () => scheduleHydrate())
        .subscribe();

    // Phase 4 — defensive polling loop
    const heartbeat = setInterval(() => {
        scheduleHydrate();
    }, 20000);

    return () => {
        console.log('[TELEMETRY] Dismantling Global System State Engine...');
        clearInterval(heartbeat);
        supabase.removeChannel(channel);
        if (hydrateTimer) {
            clearTimeout(hydrateTimer);
            hydrateTimer = null;
        }
    };
}
