const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const inspectorDir = path.join(rootDir, '.carss_inspector');

if (!fs.existsSync(inspectorDir)) {
    fs.mkdirSync(inspectorDir);
}

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walkSync(filePath, filelist);
            }
        } else {
            filelist.push(filePath);
        }
    });
    return filelist;
}

const allFiles = walkSync(rootDir);
const codeFiles = allFiles.filter(f => /\.(tsx|jsx|ts|js)$/.test(f));

// 1 Map QR ordering interfaces
console.log("🔍 MAPPING QR ORDER INTERFACES...");
const qrInterfaces = codeFiles.filter(f => /qr|order|menu|bar|terminal/i.test(f));
fs.writeFileSync(path.join(inspectorDir, 'qr_interfaces.txt'), qrInterfaces.join('\n'));

// Helper for grep-like search
function searchPattern(pattern, files) {
    const results = [];
    files.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (pattern.test(line)) {
                    results.push(`${file}:${index + 1}:${line.trim()}`);
                }
            });
        } catch (e) {
            // Skip files that can't be read
        }
    });
    return results;
}

// 2 Extract all Supabase interactions
console.log("🔍 EXTRACTING SUPABASE CALLS...");
const supabaseCalls = searchPattern(/supabase|from\('|rpc\('/, codeFiles);
fs.writeFileSync(path.join(inspectorDir, 'all_supabase_calls.txt'), supabaseCalls.join('\n'));

// 3 Map CARSS core table references
console.log("🔍 MAPPING POS TABLE REFERENCES...");
const tableRefs = searchPattern(/from\('(orders|order_items|payment_intents|transactions|shifts|inventory|menu_items)'\)/, codeFiles);
fs.writeFileSync(path.join(inspectorDir, 'table_references.txt'), tableRefs.join('\n'));

// 4 Map all RPC calls
console.log("🔍 MAPPING RPC FUNCTIONS...");
const rpcCalls = searchPattern(/rpc\('/, codeFiles);
fs.writeFileSync(path.join(inspectorDir, 'rpc_calls.txt'), rpcCalls.join('\n'));

// 5 Map frontend types
console.log("🔍 MAPPING TYPE DEFINITIONS...");
const typeFiles = allFiles.filter(f => /\.(tsx|ts)$/.test(f));
const typeDefs = searchPattern(/interface|type|export interface|export type/, typeFiles);
fs.writeFileSync(path.join(inspectorDir, 'types.txt'), typeDefs.join('\n'));

// 6 Map terminal components
console.log("🔍 MAPPING TERMINAL COMPONENTS...");
const componentFiles = codeFiles.filter(f => /\.(tsx|jsx)$/.test(f));
const components = [];
componentFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('export default')) {
            components.push(file);
        }
    } catch (e) { }
});
fs.writeFileSync(path.join(inspectorDir, 'components.txt'), components.join('\n'));

console.log("✅ CARSS INSPECTION COMPLETE");
