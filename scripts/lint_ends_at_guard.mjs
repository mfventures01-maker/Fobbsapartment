import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ignoreDirs = ['node_modules', '.git', 'dist', '.vercel', 'scripts']; // Let's avoid checking our own script manually

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                walkSync(filepath, filelist);
            }
        } else {
            // Only examine TS, TSX, MJS, JS, JSON, SQL files
            if (/\.(ts|tsx|js|mjs|json|sql)$/.test(file)) {
                filelist.push(filepath);
            }
        }
    }
    return filelist;
}

let violations = 0;
const files = walkSync(rootDir);

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('e' + 'nd_time')) {
            if (file.includes('20260219140000_stabilization_hardening.sql') ||
                file.includes('20260308000000_shift_engine_guard.sql') ||
                file.includes('db_dump.json') ||
                file.includes('test_') ||
                file.includes('20260218120000_performance_certification.sql')) {
                // allow historical fix files
                continue;
            }
            console.error(`Lint Error: Forbidden string "end_time" found at ${file}:${i + 1}`);
            console.error(`> ${lines[i].trim()}`);
            violations++;
        }
    }
}

if (violations > 0) {
    console.error(`\n❌ Failed: Found ${violations} references to 'end_time'. Please use 'ends_at'.`);
    process.exit(1);
} else {
    console.log('\n✅ Passed: No forbidden "e" + "nd_time" references found in active code.');
    process.exit(0);
}
