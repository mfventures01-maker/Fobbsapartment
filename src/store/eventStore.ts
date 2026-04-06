import { create } from 'zustand';

interface SystemEvent {
    id: string;
    event_id: number; // Logical clock
    aggregate_id: string;
    event_type: string;
    payload: any;
    metadata?: any; // New: metadata.new_state path
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
    bookings: Record<string, any>;
    shifts: Record<string, any>;
    staff: Record<string, any>;

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
    bookings: {},
    shifts: {},
    staff: {},

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
            // 🛠️ DETERMINISTIC STATE RECONCILIATION
            const newState = {
                orders: { ...state.orders },
                inventory: { ...state.inventory },
                bookings: { ...state.bookings },
                shifts: { ...state.shifts },
                staff: { ...state.staff }
            };

            // 🧬 Step 1: Resolve new_state with fallback logic
            const newStateData = event.metadata?.new_state || event.payload?.new_state;

            if (!newStateData) {
                console.warn(`[EDA_TRACE] SKIP_EVENT: No new_state found in metadata or payload. EventId: ${event.id}`, event);
                // Advance clock even if we skip to allow queue progression
                return {
                    ...state,
                    lastEventId: event.event_id,
                    processedIds: new Set(state.processedIds).add(event.id)
                };
            }

            const { aggregate_id, event_type } = event;

            // 🧩 Step 2: Role/Domain Specific Routing
            if (event_type.startsWith('ORDER_')) {
                newState.orders[aggregate_id] = { ...newStateData, updated_at: event.created_at };
            }
            else if (event_type.startsWith('BOOKING_')) {
                newState.bookings[aggregate_id] = { ...newStateData, updated_at: event.created_at };
            }
            else if (event_type.startsWith('SHIFT_')) {
                newState.shifts[aggregate_id] = { ...newStateData, updated_at: event.created_at };
            }
            else if (event_type.startsWith('STAFF_')) {
                newState.staff[aggregate_id] = { ...newStateData, updated_at: event.created_at };
            }
            else if (event_type === 'INVENTORY_UPDATE') {
                const bid = event.branch_id;
                const pid = aggregate_id; // Usually product_id
                if (!newState.inventory[bid]) newState.inventory[bid] = {};
                newState.inventory[bid][pid] = newStateData.quantity;
            }

            // 🔒 Step 3: Advance Logical Clock & Persist
            const newProcessed = new Set(state.processedIds).add(event.id);
            localStorage.setItem('carss_last_event_id', event.event_id.toString());

            return {
                ...newState,
                processedIds: newProcessed,
                lastEventId: event.event_id,
                eventQueue: state.eventQueue.filter(e => e.id !== event.id)
            };
        });
    }
}));
