#!/bin/bash
# save as scripts/map-codebase.sh

echo "🗺️ GENERATING COMPLETE CODEBASE MAP"
echo "======================================"

# Create output directory
mkdir -p codebase-map

# 1. DIRECTORY STRUCTURE TREE
echo "📁 Generating directory tree..."
tree -I 'node_modules|.git|dist|build|coverage|.next' -L 4 > codebase-map/directory-tree.txt

# 2. FILE INVENTORY BY TYPE
echo "📊 Counting files by type..."
find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | grep -E '\.(js|jsx|ts|tsx|sql|css|scss|json|md)$' | sed -n 's/.*\.//p' | sort | uniq -c | sort -rn > codebase-map/file-types.txt

# 3. COMPONENT INVENTORY
echo "🧩 Mapping React components..."
find . -type f -name "*.jsx" -o -name "*.tsx" -not -path "*/node_modules/*" | while read file; do
    grep -l "export default\|export const" "$file" | xargs -I {} echo "{}" >> codebase-map/components.txt
done

# 4. SUPABASE INTEGRATIONS
echo "🔌 Finding Supabase clients..."
grep -r --include="*.{js,jsx,ts,tsx}" "createClient\|supabase" --exclude-dir=node_modules . > codebase-map/supabase-clients.txt

# 5. RPC FUNCTIONS
echo "📡 Finding RPC calls..."
grep -r --include="*.{js,jsx,ts,tsx}" "rpc(\|invokeFunction" --exclude-dir=node_modules . > codebase-map/rpc-calls.txt

# 6. REALTIME SUBSCRIPTIONS
echo "🔄 Finding realtime subscriptions..."
grep -r --include="*.{js,jsx,ts,tsx}" "channel(\|on('postgres_changes'\|subscribe(" --exclude-dir=node_modules . > codebase-map/realtime-subscriptions.txt

# 7. DATABASE SCHEMA
echo "🗄️ Extracting database schema..."
find . -name "*.sql" -not -path "*/node_modules/*" -exec cat {} \; > codebase-map/all-sql.sql

# 8. ENVIRONMENT VARIABLES
echo "🔐 Finding environment variables..."
grep -r --include="*.{js,jsx,ts,tsx,env}" "process.env\|import.meta.env" --exclude-dir=node_modules . > codebase-map/env-vars.txt

# 9. API ROUTES
echo "🛣️ Finding API routes..."
find . -path "*/pages/api/*" -o -path "*/app/api/*" -o -path "*/routes/*" 2>/dev/null | while read route; do
    echo "$route" >> codebase-map/api-routes.txt
done

# 10. DEPENDENCY GRAPH
echo "📦 Analyzing dependencies..."
if [ -f "package.json" ]; then
    cat package.json | jq '.dependencies, .devDependencies' > codebase-map/dependencies.json
fi

echo "✅ Codebase map generated in ./codebase-map/"
