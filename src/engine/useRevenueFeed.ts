import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface RevenueMetrics {
    total_revenue: number;
    open_orders_count: number;
    active_shifts_count: number;
}

export const useRevenueFeed = () => {
    const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchMetrics = async () => {
        try {
            // War Rule: Fetch from DB views only, never compute locally.
            const { data, error } = await supabase
                .from('dashboard_realtime_metrics') // View assumed based on Phase 6 context
                .select('*')
                .maybeSingle();

            if (error) {
                // Fallback for simulation if view hasn't been instantiated yet
                if (error.code !== '42P01') throw error;
                // Mocking structure only if view is missing for pure development continuity
                setMetrics({
                    total_revenue: 0,
                    open_orders_count: 0,
                    active_shifts_count: 0,
                });
                return;
            }

            setMetrics(data);
            setError(null);
        } catch (e: any) {
            console.error('[Dashboard Truth] Failed to grab real-time metrics:', e);
            setError(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Poll every 15 seconds
        const intervalId = setInterval(() => {
            fetchMetrics();
        }, 15000);

        // Optional: Realtime subscription could be added here if configured

        return () => clearInterval(intervalId);
    }, []);

    return { metrics, loading, error, refetch: fetchMetrics };
};
