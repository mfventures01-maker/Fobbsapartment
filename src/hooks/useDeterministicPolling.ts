import { useEffect } from 'react';

export function useDeterministicPolling(fn: () => Promise<void>, interval = 2000) {
    useEffect(() => {
        let active = true;

        const run = async () => {
            if (!active) return;
            try {
                await fn();
            } catch (err) {
                console.error("[POLLING FAILURE]", err);
            }
        };

        const id = setInterval(run, interval);

        return () => {
            active = false;
            clearInterval(id);
        };
    }, [fn, interval]);
}
