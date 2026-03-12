import { useSystemStore } from '../store/systemStore';
import { HOTEL_CONFIG } from '../config/cars.config';

let hydrateTimer: NodeJS.Timeout | null = null;

export function scheduleHydrate() {
    if (hydrateTimer) return;

    hydrateTimer = setTimeout(() => {
        useSystemStore.getState().refresh(HOTEL_CONFIG.org_id);
        hydrateTimer = null;
    }, 500);
}

/**
 * Global System Telemetry (SSOT Phase 2)
 * Orchestrates realtime synchronization across all terminals.
 */
export function setupTelemetry() {
    console.log('[SSOT] Booting High-Res Telemetry Engine...');

    const unsubscribe = useSystemStore.getState().subscribe(HOTEL_CONFIG.org_id);

    // Defensive Heartbeat (Bank-grade persistence)
    const heartbeat = setInterval(() => {
        scheduleHydrate();
    }, 45000); // 45s heartbeat to ensure sync if websockets flake

    return () => {
        console.log('[SSOT] Dismantling Telemetry Engine...');
        clearInterval(heartbeat);
        unsubscribe();
        if (hydrateTimer) {
            clearTimeout(hydrateTimer);
            hydrateTimer = null;
        }
    };
}
