import { supabase } from './supabaseClient';
import { useSystemStore } from '../store/systemStore';
import { HOTEL_CONFIG } from '../config/cars.config';

export function setupTelemetry() {
    const hydrate = useSystemStore.getState().hydrate;
    let isHydrating = false;

    const triggerHydrate = async () => {
        if (isHydrating) return;
        isHydrating = true;
        await hydrate(HOTEL_CONFIG.org_id);
        isHydrating = false;
    };

    console.log('[TELEMETRY] Booting Global System State Engine (SSSE)...');

    const channel = supabase
        .channel('carss-global-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, triggerHydrate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, triggerHydrate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, triggerHydrate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_intents' }, triggerHydrate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, triggerHydrate)
        .subscribe();

    // Phase 4 — defensive polling loop
    const heartbeat = setInterval(() => {
        triggerHydrate();
    }, 20000);

    return () => {
        console.log('[TELEMETRY] Dismantling Global System State Engine...');
        clearInterval(heartbeat);
        supabase.removeChannel(channel);
    };
}
