const fs = require('fs');
const path = require('path');

const currentFunctions = [
    'create_qr_order_gateway',
    'create_order_gateway',
    'confirm_payment_intent',
    'reject_payment_intent',
    'approve_shift_open',
    'reject_shift_open',
    'reject_shift',
    'submit_shift_declaration',
    'approve_shift_close',
    'end_shift',
    'get_system_state',
    'queue_ceo_alert',
    'disable_staff',
    'create_staff_invitation'
];

const rpcFile = path.join('.carss_inspector', 'rpc_calls.txt');
if (!fs.existsSync(rpcFile)) {
    console.error("rpc_calls.txt not found");
    process.exit(1);
}

const rpc = fs.readFileSync(rpcFile, 'utf8');
const lines = rpc.split('\n');
const called = new Set();

lines.forEach(l => {
    const m = l.match(/rpc\(['"]([^'"]+)['"]/);
    if (m) called.add(m[1]);
});

console.log("=== PHASE 4: LEGACY FUNCTION DETECTION ===\n");

console.log("FUNCTIONS CALLED IN CODEBASE:");
called.forEach(f => console.log("  ✓", f));

console.log("\nEXPECTED CORE FUNCTIONS:");
currentFunctions.forEach(f => {
    const inUse = called.has(f);
    console.log(inUse ? "  ✅" : "  ⚠️ ", f, inUse ? "(FOUND)" : "(NOT CALLED IN FRONTEND)");
});

console.log("\nPOTENTIAL LEGACY / UNEXPECTED FUNCTIONS:");
let legacyCount = 0;
called.forEach(f => {
    if (!currentFunctions.includes(f)) {
        console.log("  🚨", f);
        legacyCount++;
    }
});
if (legacyCount === 0) {
    console.log("  ✅ No legacy functions detected. All RPC calls match expected core set.");
}

// Detect direct table inserts that should go through gateways
console.log("\n=== PHASE 6: DIRECT INSERT AUDIT ===\n");

const supabaseFile = path.join('.carss_inspector', 'all_supabase_calls.txt');
const allCalls = fs.readFileSync(supabaseFile, 'utf8');
const allLines = allCalls.split('\n');

const directInserts = {
    orders: [],
    order_items: [],
    payment_intents: [],
    transactions: []
};

allLines.forEach(line => {
    // Skip service layer files (these are expected patterns)
    if (line.includes('services/orderService') || line.includes('services/paymentService')) return;
    // Skip migration/script files
    if (line.includes('supabase/') || line.includes('scripts/') || line.includes('test_') || line.includes('.mjs')) return;

    Object.keys(directInserts).forEach(table => {
        if (line.includes(`from('${table}')`) && line.includes('.insert(')) {
            directInserts[table].push(line.trim());
        }
    });
});

let violations = 0;
Object.entries(directInserts).forEach(([table, hits]) => {
    if (hits.length > 0) {
        console.log(`🚨 DIRECT INSERTS into '${table}' (should use gateway RPC):`);
        hits.forEach(h => {
            const parts = h.split(':');
            const file = parts[0].split('\\').pop() || parts[0].split('/').pop();
            console.log(`   → ${file} (line ${parts[1]})`);
            violations++;
        });
    }
});

if (violations === 0) {
    console.log("✅ No unauthorized direct inserts into core tables detected.");
} else {
    console.log(`\n⚠️  ${violations} violation(s) found. These should be refactored to use gateway RPCs.`);
}

// Direct updates to payment_intents outside service layer
console.log("\n=== DIRECT payment_intents UPDATES (outside service layer) ===\n");
const directUpdates = [];
allLines.forEach(line => {
    if (line.includes('services/paymentService') || line.includes('services/orderService')) return;
    if (line.includes('supabase/') || line.includes('scripts/')) return;
    if (line.includes("from('payment_intents')") && line.includes('.update(')) {
        directUpdates.push(line.trim());
    }
});

if (directUpdates.length > 0) {
    directUpdates.forEach(h => {
        const parts = h.split(':');
        const file = parts[0].split('\\').pop() || parts[0].split('/').pop();
        console.log(`  ⚠️  ${file}:${parts[1]}`);
    });
} else {
    console.log("  ✅ No unauthorized direct updates to payment_intents.");
}
