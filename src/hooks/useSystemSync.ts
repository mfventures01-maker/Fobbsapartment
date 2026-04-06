import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../store/eventStore';

/**
 * 🛸 ANTI-GRAVITY SYSTEM SYNC (LAYER 6)
 * Deterministically orchestrates the Real-Time Mirroring and Reconnection Catch-up.
 */

export function useSystemSync() {
    const { authority, session } = useAuth();
    const pushEvent = useEventStore((state) => state.pushEvent);
    const lastEventId = useEventStore((state) => state.lastEventId);
    const syncLastEventId = useEventStore((state) => state.syncLastEventId);

    const branchId = authority.branchId;
    const channelRef = useRef<any>(null);

    // ── STEP 1: INITIAL HYDRATION & CATCH-UP ──────────
    const catchUp = async (bid: string, currentClock: number) => {
        console.log('[EDA_TRACE] catch_up:START', { branchId: bid, lastKnownId: currentClock });
        try {
            const { data, error } = await supabase.rpc('get_missing_events', {
                p_branch_id: bid,
                p_last_event_id: currentClock
            });

            if (error) throw error;

            if (data && data.length > 0) {
                console.log('[EDA_TRACE] catch_up:SUCCESS', { missingCount: data.length });
                data.forEach((evt: any) => pushEvent(evt));
            } else {
                console.log('[EDA_TRACE] catch_up:IDLE (No missing events)');
            }
        } catch (err) {
            console.error('[EDA_TRACE] catch_up:FAILURE', err);
        }
    };

    useEffect(() => {
        if (!session || !branchId) return;

        // Load last logic clock from persistent storage if store is fresh
        const storedClock = parseInt(localStorage.getItem('carss_last_event_id') || '0', 10);
        if (storedClock > lastEventId) syncLastEventId(storedClock);

        // ── STEP 2: REAL-TIME SUBSCRIPTION ──────────
        console.log('[EDA_TRACE] subscribing:operational_events', { branchId });

        const channel = supabase
            .channel(`branch_events:${branchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'operational_events',
                    filter: `branch_id=eq.${branchId}`,
                },
                (payload) => {
                    console.log('[EDA_TRACE] realtime:EVENT_RECEIVED', payload.new.id);
                    pushEvent(payload.new as any);
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[EDA_TRACE] realtime:CONNECTED');
                    // Immediately catch up on events missed while connecting
                    await catchUp(branchId, useEventStore.getState().lastEventId);
                }
            });

        channelRef.current = channel;

        // ── STEP 3: POLLING FALLBACK ──────────
        const poller = setInterval(() => {
            if (channel.state !== 'joined') {
                console.warn('[EDA_TRACE] realtime:DISCONNECTED — triggering polling fallback');
                catchUp(branchId, useEventStore.getState().lastEventId);
            }
        }, 5000);

        return () => {
            console.log('[EDA_TRACE] unsubscribing:operational_events', { branchId });
            supabase.removeChannel(channel);
            clearInterval(poller);
        };
    }, [session, branchId]);

    return { lastEventId };
}
