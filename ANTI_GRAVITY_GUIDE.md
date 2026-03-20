# 🧲 CARSS ANTI-GRAVITY GUIDE
(Zero Drift. Zero Guessing. Absolute Determinism.)

## 🧠 1. WHAT “ANTI-GRAVITY” MEANS IN CARSS
In normal systems, frontend pulls logic, backend reacts, and data drifts. In CARSS, nothing floats. Everything is anchored.

**Anti-gravity =**
- 👉 No hidden logic
- 👉 No duplicated state
- 👉 No silent assumptions

## ⚖️ 2. THE THREE LAWS OF CARSS PHYSICS

### LAW 1: BACKEND IS THE ONLY SOURCE OF TRUTH
If it is not written in the database → it does not exist.

**Frontend:**
- cannot invent state
- cannot “help” the backend
- cannot assume anything

### LAW 2: ALL ACTIONS ARE RPC COMMANDS
No direct table mutation from frontend. Ever.

- **Allowed:** `supabase.rpc('create_qr_order_gateway', payload)`
- **Forbidden:** `supabase.from('orders').insert(...)`, `supabase.from('shifts').update(...)`

### LAW 3: EVERY STATE MUST BE DERIVED, NOT STORED
- **Bad:** Frontend tracks “current shift” or “order total”.
- **Good:** Backend computes shift; Backend computes totals; Frontend only reflects.

## 🧬 3. THE SYSTEM SPINE (IMMUTABLE CHAIN)
`SHIFT → ORDER → ITEMS → PAYMENT → TRANSACTION`

If anything breaks here, the system collapses.

| Layer | Purpose |
| :--- | :--- |
| **Shift** | Operational anchor |
| **Order** | Customer intent |
| **Items** | Economic breakdown |
| **Payment Intent** | Financial expectation |
| **Transaction** | Confirmed reality |

## ⚙️ 4. ANTI-GRAVITY IMPLEMENTATION RULES

### 🔹 RULE 1: SHIFT MUST EXIST BEFORE ORDER
`resolve_active_shift()` must resolve the state anchor. Never pass `shift_id` from the frontend or hardcode it.

### 🔹 RULE 2: ORDER CREATION IS ATOMIC
Inside **ONE** function:
1. Create order
2. Insert items
3. Calculate totals
4. Create payment

If split, drift enters.

### 🔹 RULE 3: ITEMS MUST BE SELF-SUFFICIENT
Each item must contain:
```json
{
  "name": "...",
  "qty": 2,
  "price": 10
}
```
Never depend on menu lookups at runtime or external joins during creation.

### 🔹 RULE 4: PAYMENT IS NOT OPTIONAL
Every order **MUST** produce a `payment_intent`. Without it, the system enters a financial black hole.

### 🔹 RULE 5: NO CONDITIONAL LOGIC IN FRONTEND
**Bad:** `if (!shift) createShift()`
**Good:** Call gateway → backend decides everything.

## 🧠 5. THE RESOLVE ENGINE (ANTI-DRIFT CORE)
`resolve_active_shift()` MUST:
1. Check existing shift.
2. Return immediately if found.
3. Only create if none exists.

**Correct Pattern:**
```sql
 IF shift_exists THEN
     RETURN shift_id;
 END IF;
 -- only now create
```

## 🚨 6. DRIFT DETECTION SIGNALS
If you see any of these, the anti-gravity field is compromised:

| Symptom | Meaning |
| :--- | :--- |
| Duplicate shifts | Resolver broken |
| Wrong totals | Frontend interference |
| Missing payment | Gateway incomplete |
| FK errors | Broken hierarchy |
| Manual fixes needed | System not deterministic |

## 🧪 7. TESTING THE ANTI-GRAVITY FIELD
- **Test 1 (Repeat Same Order):** Run `create_qr_order_gateway` twice. Expected: same shift reused, no duplicates.
- **Test 2 (Empty Cart):** Expected `ERROR: No valid items`.
- **Test 3 (Invalid Price):** Expected `ERROR: Invalid qty or price`.
- **Test 4 (Shift Constraint):** Never creates duplicate open shift.

## 📡 8. EVENT CONSISTENCY (REALTIME PREP)
Your system emits: `orders → payment_intents → shifts → transactions`.
Anti-gravity ensures every event is valid before broadcast; no “ghost data” reaches UI.

## 🏁 FINAL IMAGE
- **Frontend** → sends intention
- **Backend** → executes reality
- **Database** → stores truth
- **Realtime** → broadcasts truth
- **UI** → reflects truth

---
**CARSS is not reactive. It is declarative.**
Frontend says: “Create order”
Backend decides: *everything else*
