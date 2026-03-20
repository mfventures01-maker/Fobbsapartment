const fs = require('fs');
const path = require('path');

console.log("=== PHASE 7: CARSS ALIGNMENT VALIDATION ===\n");

const inspectorDir = '.carss_inspector';

let passed = 0;
let failed = 0;
let warnings = 0;

function test(name, condition, detail) {
    if (condition) {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${name}`);
        if (detail) console.log(`          ${detail}`);
        failed++;
    }
}

function warn(name, detail) {
    console.log(`  ⚠️  WARN: ${name}`);
    if (detail) console.log(`          ${detail}`);
    warnings++;
}

// 1. Service Layer Exists
console.log("--- TEST 1: Service Layer Architecture ---");
const orderServiceExists = fs.existsSync(path.join('src', 'services', 'orderService.ts'));
const paymentServiceExists = fs.existsSync(path.join('src', 'services', 'paymentService.ts'));
const shiftServiceExists = fs.existsSync(path.join('src', 'services', 'shiftService.ts'));
test('orderService.ts exists', orderServiceExists);
test('paymentService.ts exists', paymentServiceExists);
test('shiftService.ts exists', shiftServiceExists);

// 2. Gateway RPC Usage
console.log("\n--- TEST 2: Gateway RPC Usage ---");
if (orderServiceExists) {
    const orderService = fs.readFileSync(path.join('src', 'services', 'orderService.ts'), 'utf8');
    test('orderService calls create_qr_order_gateway', orderService.includes('create_qr_order_gateway'));
    test('orderService calls create_order_gateway', orderService.includes('create_order_gateway'));
    test('orderService does NOT directly insert into orders', !orderService.includes(".from('orders').insert"));
}

if (paymentServiceExists) {
    const paymentService = fs.readFileSync(path.join('src', 'services', 'paymentService.ts'), 'utf8');
    test('paymentService calls confirm_payment_intent RPC', paymentService.includes('confirm_payment_intent'));
    test('paymentService does NOT directly insert into transactions', !paymentService.includes(".from('transactions').insert"));
}

// 3. Public QR Pages use service layer
console.log("\n--- TEST 3: QR Terminal Pages Use Service Layer ---");
const barPublicPath = path.join('src', 'pages', 'public', 'BarPublic.tsx');
const restaurantPublicPath = path.join('src', 'pages', 'public', 'RestaurantPublic.tsx');

if (fs.existsSync(barPublicPath)) {
    const barPublic = fs.readFileSync(barPublicPath, 'utf8');
    test('BarPublic imports createPublicOrder', barPublic.includes('createPublicOrder'));
    test('BarPublic calls createPublicOrder (not direct insert)', barPublic.includes('createPublicOrder('));
    test('BarPublic does NOT directly insert into orders', !barPublic.includes(".from('orders').insert"));
}

if (fs.existsSync(restaurantPublicPath)) {
    const restaurantPublic = fs.readFileSync(restaurantPublicPath, 'utf8');
    test('RestaurantPublic imports createPublicOrder', restaurantPublic.includes('createPublicOrder'));
    test('RestaurantPublic calls createPublicOrder', restaurantPublic.includes('createPublicOrder('));
}

// 4. Staff Terminal uses service layer
console.log("\n--- TEST 4: Staff Terminal Uses Service Layer ---");
const staffTerminalPath = path.join('src', 'pages', 'dashboard', 'staff', 'StaffOperationalTerminal.tsx');
if (fs.existsSync(staffTerminalPath)) {
    const staffTerminal = fs.readFileSync(staffTerminalPath, 'utf8');
    test('StaffTerminal imports createStaffOrder', staffTerminal.includes('createStaffOrder'));
    test('StaffTerminal imports confirmPaymentIntent', staffTerminal.includes('confirmPaymentIntent'));
    test('StaffTerminal does NOT directly insert into orders', !staffTerminal.includes(".from('orders').insert"));
}

// 5. Payment Confirmation page calls RPC
console.log("\n--- TEST 5: ConfirmPayment Uses RPC ---");
const confirmPath = path.join('src', 'pages', 'ConfirmPayment.tsx');
if (fs.existsSync(confirmPath)) {
    const confirmPayment = fs.readFileSync(confirmPath, 'utf8');
    test('ConfirmPayment calls confirm_payment_intent RPC', confirmPayment.includes("rpc('confirm_payment_intent'"));
}

// 6. Gateway Migration exists
console.log("\n--- TEST 6: Backend Gateway Migrations ---");
const migrationsDir = path.join('supabase', 'migrations');
const migrationFiles = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir) : [];
test('QR order gateway migration exists', migrationFiles.some(f => f.includes('qr_order_gateway')));
test('Confirm payment integrity migration exists', migrationFiles.some(f => f.includes('confirm_payment_integrity')));
test('Universal order gateway migration exists', migrationFiles.some(f => f.includes('universal_order_gateway')));

// 7. Detect dangerous patterns
console.log("\n--- TEST 7: Anti-Pattern Detection ---");
const rpcCalls = fs.readFileSync(path.join(inspectorDir, 'rpc_calls.txt'), 'utf8');
const serviceRpcCalls = rpcCalls.split('\n').filter(l => l.includes('services/'));
const directRpcCalls = rpcCalls.split('\n').filter(l => !l.includes('services/') && l.trim());

if (directRpcCalls.length > 0) {
    warn(`${directRpcCalls.length} RPC calls made outside service layer`,
        'Consider routing ALL RPCs through service files for consistency');
    directRpcCalls.forEach(l => {
        const parts = l.split(':');
        const shortFile = parts[0].split('\\').pop() || parts[0].split('/').pop();
        console.log(`          → ${shortFile}:${parts[1]}`);
    });
}

// 8. Check PaymentIntent page for direct insert (not via gateway)
console.log("\n--- TEST 8: PaymentIntent Page Alignment ---");
const paymentIntentPath = path.join('src', 'pages', 'PaymentIntent.tsx');
if (fs.existsSync(paymentIntentPath)) {
    const piContent = fs.readFileSync(paymentIntentPath, 'utf8');
    const directInsert = piContent.includes(".from('payment_intents').insert");
    if (directInsert) {
        warn('PaymentIntent.tsx directly inserts into payment_intents',
            'Gateway already creates intent. This creates DUPLICATE intents.');
    } else {
        test('PaymentIntent.tsx does not insert duplicate intents', true);
    }
}

// Summary
console.log("\n========================================");
console.log(`  ✅ PASSED:   ${passed}`);
console.log(`  ❌ FAILED:   ${failed}`);
console.log(`  ⚠️  WARNINGS: ${warnings}`);
console.log("========================================");

if (failed === 0) {
    console.log("\n🟢 CARSS CORE PIPELINE IS ALIGNED");
} else {
    console.log("\n🔴 ALIGNMENT FAILURES DETECTED — INTERVENTION REQUIRED");
}
