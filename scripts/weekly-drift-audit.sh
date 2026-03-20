#!/bin/bash
# scripts/weekly-drift-audit.sh

set -e  # 🚨 FAIL FAST

echo "🪞 WEEKLY DRIFT ZERO AUDIT"
echo "=========================="
echo "Date: $(date)"
echo ""

REPORT_FILE="drift-zero-audit-$(date +%Y%m%d).md"
echo "# Drift Zero Audit Report - $(date)" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

FAIL=0

# 🔴 1. FORBIDDEN PATTERN SCAN (NON-NEGOTIABLE)
echo "## 🔴 Forbidden Access Scan" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Exclude central infrastructure and comments
FORBIDDEN=$(grep -r "supabase\.\(from\|rpc\|functions\.invoke\)" --include="*.ts" --include="*.tsx" src/ | \
            grep -v "src/lib/rpcClient.ts" | \
            grep -v "src/lib/callEdgeFunction.ts" | \
            grep -v "//" | \
            grep -v "FIX:" | \
            grep -v "PERMITTED" || true)

if [ -n "$FORBIDDEN" ]; then
  echo "❌ FORBIDDEN SUPABASE USAGE FOUND:" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$FORBIDDEN" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  FAIL=1 # ENFORCED
else
  echo "✅ No forbidden Supabase usage detected" >> "$REPORT_FILE"
fi

# 🔴 2. LOCAL STATE DRIFT DETECTION
echo "" >> "$REPORT_FILE"
echo "## 🔴 Local State Drift Detection" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Exclude derived state patterns and comments
STATE_DRIFT=$(grep -r "useState" --include="*.ts" --include="*.tsx" src/ | \
              grep -E "total|revenue|stock|isAvailable" | \
              grep -v "//" | \
              grep -v "FIX:" | \
              grep -v "counted_cash" | \
              grep -v "pos_machine_total" | \
              grep -v "transfer_total" || true)

if [ -n "$STATE_DRIFT" ]; then
  echo "❌ Potential local state authority detected:" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$STATE_DRIFT" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  FAIL=1 # ENFORCED
else
  echo "✅ No local state authority detected" >> "$REPORT_FILE"
fi

# 🔴 3. MANUAL CALCULATION DETECTION
echo "" >> "$REPORT_FILE"
echo "## 🔴 Manual Calculation Scan" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Exclude comments
CALC=$(grep -r "reduce(" --include="*.ts" --include="*.tsx" src/ | grep -v "//" | grep -v "FIX:" || true)

if [ -n "$CALC" ]; then
  echo "❌ Potential frontend calculations detected:" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$CALC" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  FAIL=1
else
  echo "✅ No manual calculations detected" >> "$REPORT_FILE"
fi

# 🟡 4. RPC DISTRIBUTION
echo "" >> "$REPORT_FILE"
echo "## 🟡 RPC Call Distribution" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

RPC_COUNT=$(grep -r "callRPC" --include="*.ts" --include="*.tsx" src/ | wc -l)
echo "| Metric | Value |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| Total RPC Calls | $RPC_COUNT |" >> "$REPORT_FILE"

# 🟡 5. IDEMPOTENCY CHECK
echo "" >> "$REPORT_FILE"
echo "## 🟡 Idempotency Coverage" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

IDEMPOTENT=$(grep -r "_idempotency_key" --include="*.ts" --include="*.tsx" src/ | wc -l)

if [ "$RPC_COUNT" -gt 0 ]; then
  PERCENTAGE=$((IDEMPOTENT * 100 / RPC_COUNT))
else
  PERCENTAGE=0
fi

echo "| Metric | Value |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| RPC Calls | $RPC_COUNT |" >> "$REPORT_FILE"
echo "| Idempotency Keys | $IDEMPOTENT |" >> "$REPORT_FILE"
echo "| Coverage | $PERCENTAGE% |" >> "$REPORT_FILE"

CENTRAL_INJECTION=$(grep "payload._idempotency_key =" src/lib/rpcClient.ts || true)

if [ "$PERCENTAGE" -lt 100 ] && [ -z "$CENTRAL_INJECTION" ]; then
  echo "❌ Idempotency coverage below 100% and no central injection found" >> "$REPORT_FILE"
  FAIL=1
elif [ "$PERCENTAGE" -lt 100 ]; then
  echo "⚠️ Idempotency coverage at $PERCENTAGE% but central injection detected in rpcClient.ts" >> "$REPORT_FILE"
fi

# 🔵 6. EDGE FUNCTION CHECK
echo "" >> "$REPORT_FILE"
echo "## 🔵 Edge Function Enforcement" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

EDGE=$(grep -r "functions.invoke" --include="*.ts" --include="*.tsx" src/ | \
       grep -v "src/lib/callEdgeFunction.ts" | \
       grep -v "src/lib/rpcClient.ts" | \
       grep -v "//" | \
       grep -v "FIX:" | \
       grep -v "PERMITTED" || true)

if [ -n "$EDGE" ]; then
  echo "❌ Direct Edge Function usage detected (must use callEdgeFunction):" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$EDGE" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  FAIL=1
else
  echo "✅ All edge functions properly wrapped" >> "$REPORT_FILE"
fi

# 🧠 FINAL ASSERTION
echo "" >> "$REPORT_FILE"
echo "## 🧠 Final Assertion" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$FAIL" -eq 1 ]; then
  echo "❌ DRIFT DETECTED — SYSTEM NOT SAFE FOR DEPLOYMENT" >> "$REPORT_FILE"
  echo ""
  echo "❌ DRIFT DETECTED — FIX REQUIRED BEFORE DEPLOYMENT"
  exit 1
else
  echo "✅ DRIFT ZERO CONFIRMED — SYSTEM ALIGNED" >> "$REPORT_FILE"
  echo ""
  echo "✅ SYSTEM PASSED DRIFT AUDIT"
fi

echo ""
echo "📋 Report saved to: $REPORT_FILE"
