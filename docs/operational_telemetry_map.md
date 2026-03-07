# CARSS Operational Telemetry Map

**Anti-Gravity System Expansion**
**Status**: Realtime Cockpit Active

The CARSS frontend is now fundamentally event-driven through the unified `subscribeToOperationalTelemetry` orchestrator. All dashboards and cockpit views dynamically refresh states directly from database mutations traversing through this channel.

*No frontend-based polling loops operate any longer. The system rests cleanly until a Postgres replica frame triggers a broadcast event.*

## 1. Unified Realtime Channel
* **Channel ID**: `carss-ops`
* **Orchestrator Module**: `src/lib/realtimeTelemetry.ts`
* **Consumer Structure**: Event hook objects `OperationalCallbacks` are attached within UI `useEffect` wrappers allowing individual contexts to cherry-pick operational updates.

---

## 2. Event Routing Graph

### Shift State Pipeline
* **Source Signal**: `public.shifts` (Any `UPDATE` / `INSERT`)
* **Telemetry Handler**: `onShiftUpdate(payload)`
* **Context Consumer**: `ShiftContext.tsx`
* **Trigger Effect**: Re-evaluates access to active shifts via `getActiveShift()`, immediately updating locking guards like `ShiftProtectedRoute.tsx` allowing terminal state transitions (e.g. from Awaiting opening -> Terminal Active).

### Revenue Acquisition Pipeline
* **Source Signal**: `public.transactions` (`INSERT` matching verified revenues)
* **Telemetry Handler**: `onTransaction(payload)`
* **Context Consumer**: `Payments.tsx` (Ledger), `DashboardHome.tsx` (Live Stats), Manager & CEO Dashboards
* **Trigger Effect**: Instantaneous adjustment of gross revenue totals, chart aggregation values, and ledger append without a page reload. Confirms the closure of a payment intent.

### Payment Lifecycle Pipeline
* **Source Signal**: `public.payment_intents` (`UPDATE` matching lifecycle changes e.g., to `refunded` or `voided`)
* **Telemetry Handler**: `onPaymentIntent(payload)`
* **Context Consumer**: Outstanding Queues in POS Terminals, CEO views
* **Trigger Effect**: Pending transaction alerts resolve out of UI queues and UI charts adjust expected pending revenues downwards.

### Customer Demand Signals
* **Source Signal**: `public.orders` (`INSERT` by waitstaff or via Quick-QR)
* **Telemetry Handler**: `onOrder(payload)`
* **Context Consumer**: Kitchen Displays (if implemented), Wait-staff terminals
* **Trigger Effect**: Drops the visual order card onto the tracking views.

### Inventory Movement Pipeline
* **Source Signal**: `public.inventory_logs` (`INSERT` resulting from `deduct_inventory` triggers or restock operations)
* **Telemetry Handler**: `onInventoryChange(payload)`
* **Context Consumer**: Operational alerts, low stock views.
* **Trigger Effect**: Depletion alerts flash or adjust available stock quantities inside the `POSTerminal` dynamically to prevent over-ordering dead-stock.

### Staff Settlement Pipeline
* **Source Signal**: `public.shift_declarations` (`INSERT` during shift wrap-up)
* **Telemetry Handler**: `onShiftDeclaration(payload)`
* **Context Consumer**: Manager Dashboards
* **Trigger Effect**: The manager's screen dynamically adds a new 'Pending Reconciliation' card listing the staff ID and their declared variance values natively pushing notification rings if set.

### Security / Audit Pipeline
* **Source Signal**: `public.audit_logs` (`INSERT` tracking deletions, authorization grants, critical system events)
* **Telemetry Handler**: `onAuditLog(payload)`
* **Context Consumer**: `SuperAdminDashboard.tsx`, CEO Live Feeds
* **Trigger Effect**: Pushes a new feed card securely rendering system integrity actions natively to upper management.

## 3. Propagation Sequence Protocol

The entire system explicitly obeys the exact payload path map defined:

1. **User Request**: Staff taps 'Pay' on iPad `POSTerminal`.
2. **Service Gateway**: `orderService` formats payload array -> RPC call to Supabase.
3. **Database Guard Execution**: RPC writes `payment_intents` + `transactions` cleanly passing constraint verification.
4. **Broadcast Emitter**: PostgreSQL executes realtime internal hook broadcasting the row change.
5. **Observatory Listener**: `realtimeTelemetry.ts` traps the payload routing it safely across the `carss-ops` channel.
6. **Live Consumer Hook**: Active components reading the stream re-run state-setters.
7. **View Mutator**: DOM is updated rendering a localized successful transaction tick while a Manager's command center 2 states away flashes $+45.00 revenue instantaneously.
