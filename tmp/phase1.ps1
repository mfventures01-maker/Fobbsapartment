# Phase 1: Deep Codebase Inspection (PowerShell version - Simplified)

$ErrorActionPreference = "Continue"

if (!(Test-Path .carss_inspector)) {
    New-Item -ItemType Directory -Path .carss_inspector -Force
}

# 1 Map QR ordering interfaces
Write-Host "🔍 MAPPING QR ORDER INTERFACES..."
$files = Get-ChildItem -Path . -Recurse -Include *.tsx, *.jsx, *.ts, *.js -Exclude node_modules, dist
$qrFiles = $files | Where-Object { $_.FullName -like "*qr*" -or $_.FullName -like "*order*" -or $_.FullName -like "*menu*" -or $_.FullName -like "*bar*" -or $_.FullName -like "*terminal*" }
$qrFiles | Select-Object -ExpandProperty FullName | Out-File -FilePath .carss_inspector/qr_interfaces.txt

# Helper function for grep
function Search-Pattern($pattern, $outputFile) {
    Write-Host "Searching for pattern: $pattern"
    $results = Get-ChildItem -Path . -Recurse -Include *.tsx, *.jsx, *.ts, *.js -Exclude node_modules, dist | Select-String -Pattern $pattern
    $lines = @()
    foreach ($res in $results) {
        $lines += "$($res.Path):$($res.Line)"
    }
    $lines | Out-File -FilePath $outputFile
}

# 2 Extract all Supabase interactions
Write-Host "🔍 EXTRACTING SUPABASE CALLS..."
Search-Pattern "supabase|from\('|rpc\('" ".carss_inspector/all_supabase_calls.txt"

# 3 Map CARSS core table references
Write-Host "🔍 MAPPING POS TABLE REFERENCES..."
Search-Pattern "from\('(orders|order_items|payment_intents|transactions|shifts|inventory|menu_items)'\)" ".carss_inspector/table_references.txt"

# 4 Map all RPC calls
Write-Host "🔍 MAPPING RPC FUNCTIONS..."
Search-Pattern "rpc\('" ".carss_inspector/rpc_calls.txt"

# 5 Map frontend types
Write-Host "🔍 MAPPING TYPE DEFINITIONS..."
# Note: Types are mostly in .ts/.tsx
$typeResults = Get-ChildItem -Path . -Recurse -Include *.ts, *.tsx -Exclude node_modules, dist | Select-String -Pattern "interface|type|export interface|export type"
$typeLines = @()
foreach ($res in $typeResults) {
    $typeLines += "$($res.Path):$($res.Line)"
}
$typeLines | Out-File -FilePath .carss_inspector/types.txt

# 6 Map terminal components
Write-Host "🔍 MAPPING TERMINAL COMPONENTS..."
Get-ChildItem -Path . -Recurse -Include *.tsx, *.jsx -Exclude node_modules, dist | Select-String -Pattern "export default" -List | Select-Object -ExpandProperty Path | Out-File -FilePath .carss_inspector/components.txt

Write-Host "✅ CARSS INSPECTION COMPLETE"
