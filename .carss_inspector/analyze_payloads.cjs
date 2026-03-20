const fs = require('fs');
const path = require('path');

const callsFile = path.join('.carss_inspector', 'all_supabase_calls.txt');
if (!fs.existsSync(callsFile)) {
    console.error("Error: all_supabase_calls.txt not found");
    process.exit(1);
}

const calls = fs.readFileSync(callsFile, 'utf8');
const lines = calls.split('\n');

const payloads = [];

const patterns = [
    /\.insert\(([^)]+)\)/g,
    /\.update\(([^)]+)\)/g,
    /\.rpc\([^,]+,\s*({[^}]+})/g
];

lines.forEach(line => {
    patterns.forEach(pattern => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach(match => {
            const filePath = line.split(':')[0];
            payloads.push({
                file: filePath,
                payload: match[1]
            });
        });
    });
});

let report = "# CARSS PAYLOAD ANALYSIS\n\n";

if (payloads.length === 0) {
    report += "No payloads detected in Supabase calls.\n";
} else {
    payloads.forEach(p => {
        report += `## ${p.file}\n\`\`\`json\n${p.payload}\n\`\`\`\n\n`;
    });
}

fs.writeFileSync(path.join('.carss_inspector', 'payloads.md'), report);

console.log("✅ Payload mapping complete");
