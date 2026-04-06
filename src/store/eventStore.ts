import { create } from 'zustand';

interface SystemEvent {
    id: string;
    event_id: number; // Logical clock
    aggregate_id: string;
    event_type: string;
    payload: any;
    branch_id: string;
    created_at: string;
}

interface EventState {
    lastEventId: number;
    processedIds: Set<string>;
    eventQueue: SystemEvent[];

    // Local state maps (The Mirror)
    orders: Record<string, any>;
    inventory: Record<string, Record<string, number>>;

    // Methods
    pushEvent: (event: SystemEvent) => void;
    applyEvent: (event: SystemEvent) => void;
    syncLastEventId: (id: number) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
    lastEventId: 0,
    processedIds: new Set<string>(),
    eventQueue: [],
    orders: {},
    inventory: {},

    syncLastEventId: (id) => set({ lastEventId: id }),

    pushEvent: (event) => {
        const { processedIds, lastEventId } = get();

        // 🛡️ IDEMPOTENCY CHECK
        if (processedIds.has(event.id) || event.event_id <= lastEventId) {
            console.warn('[EDA_TRACE] DUPLICATE_EVENT_REJECTED', { id: event.id, event_id: event.event_id });
            return;
        }

        // 🛸 ORDERED DISPATCH: Enqueue and Sort (Deterministic Replay)
        const newQueue = [...get().eventQueue, event].sort((a, b) => a.event_id - b.event_id);
        set({ eventQueue: newQueue });

        // Immediately process if it's the next in sequence
        get().applyEvent(event);
    },

    applyEvent: (event) => {
        console.log(`[EDA_TRACE] APPLY_EVENT:${event.event_type}`, { id: event.id, clock: event.event_id });

        set((state) => {
            const newOrders = { ...state.orders };
            const newInventory = { ...state.inventory };

            // 🛠️ DOMAIN SPECIFIC STATE UPDATES (THE MIRROR)
            const { aggregate_id, event_type, payload } = event;

            if (event_type.startsWith('ORDER_')) {
                newOrders[aggregate_id] = {
                    status: payload.new_state.status,
                    total: payload.new_state.total,
                    customer: payload.new_state.customer_name,
                    updated_at: event.created_at
                };
            }

            if (event_type === 'INVENTORY_UPDATE') {
                const bid = payload.branch_id;
                const pid = payload.product_id;
                if (!newInventory[bid]) newInventory[bid] = {};
                newInventory[bid][pid] = payload.new_quantity;
            }

            // Mark as processed and advance logical clock
            const newProcessed = new Set(state.processedIds).add(event.id);

            // Persist logical clock to local storage for forensic recovery
            localStorage.setItem('carss_last_event_id', event.event_id.toString());

            return {
                orders: newOrders,
                inventory: newInventory,
                processedIds: newProcessed,
                lastEventId: event.event_id,
                eventQueue: state.eventQueue.filter(e => e.id !== event.id)
            };
        });
    }
}));
