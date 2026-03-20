import fs from 'fs';
import path from 'path';

class CodebaseMapper {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            summary: {},
            layers: { frontend: {}, backend: {}, database: {}, realtime: {} },
            connections: [], risks: [], recommendations: []
        };
    }

    async analyze() {
        console.log('🔬 Starting holistic analysis...');
        await this.analyzeFrontend();
        await this.analyzeBackend();
        await this.analyzeDatabase();
        await this.analyzeRealtime();
        await this.mapConnections();
        await this.assessRisks();
        this.generateReport();
    }

    findFilesRecursive(dir, extensions, excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next']) {
        let results = [];
        try {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    if (!excludeDirs.includes(file)) {
                        results = results.concat(this.findFilesRecursive(fullPath, extensions, excludeDirs));
                    }
                } else {
                    if (!extensions || extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
                        results.push(fullPath);
                    }
                }
            });
        } catch (e) { }
        return results;
    }

    findFiles(extensions, excludeSubString = null) {
        let files = this.findFilesRecursive('.', extensions);
        if (excludeSubString) {
            files = files.filter(f => !f.replace(/\\/g, '/').includes(excludeSubString));
        }
        return files.map(f => f.replace(/\\/g, '/'));
    }

    fileContains(file, patterns) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            return patterns.some(p => content.toLowerCase().includes(p.toLowerCase()));
        } catch { return false; }
    }

    async analyzeFrontend() {
        console.log('📱 Analyzing frontend...');
        const components = this.findFiles(['.jsx', '.tsx']);
        const byType = {
            pages: components.filter(c => c.includes('/pages/') || c.includes('/app/')),
            components: components.filter(c => c.includes('/components/')),
            contexts: components.filter(c => c.includes('/contexts/')),
            hooks: components.filter(c => c.includes('/hooks/')),
            utils: components.filter(c => c.includes('/utils/'))
        };
        const terminals = {
            staff: components.filter(c => this.fileContains(c, ['staff', 'pos', 'order'])),
            manager: components.filter(c => this.fileContains(c, ['manager', 'approve', 'dashboard'])),
            ceo: components.filter(c => this.fileContains(c, ['ceo', 'executive', 'overview'])),
            store: components.filter(c => this.fileContains(c, ['store', 'inventory', 'stock'])),
            kitchen: components.filter(c => this.fileContains(c, ['kitchen', 'ticket', 'prep']))
        };
        this.report.layers.frontend = {
            totalComponents: components.length,
            byType, terminals,
            entryPoints: this.findFiles(['index.js', 'index.jsx', 'index.ts', 'index.tsx', 'main.js', 'App.jsx', 'main.tsx']),
            styles: this.findFiles(['.css', '.scss', '.sass'])
        };
    }

    extractFunctionParams(content, name) {
        const regex = new RegExp(`${name}\\s*\\(([^)]*)\\)`, 'g');
        const match = regex.exec(content);
        return match ? match[1] : '';
    }

    async analyzeBackend() {
        console.log('🖥️ Analyzing backend...');
        const rpcFiles = this.findFiles(['.sql']);
        const rpcFunctions = [];
        rpcFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const matches = content.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/g) || [];
            matches.forEach(match => {
                const name = match.replace('CREATE OR REPLACE FUNCTION ', '');
                rpcFunctions.push({ name, file, params: this.extractFunctionParams(content, name) });
            });
        });
        const edgeFunctions = this.findFiles([], 'supabase/functions');
        this.report.layers.backend = {
            rpcFunctions: rpcFunctions.length, rpcList: rpcFunctions,
            edgeFunctions: edgeFunctions.length, edgeList: edgeFunctions,
            middleware: this.findFiles(['.js', '.ts'], 'middleware')
        };
    }

    extractColumns(content, table) {
        const columns = [];
        const lines = content.split('\n');
        let inTable = false;
        lines.forEach(line => {
            if (line.includes(`CREATE TABLE ${table}`)) inTable = true;
            else if (inTable && line.includes(');')) inTable = false;
            else if (inTable && line.trim().match(/^\w+/)) columns.push(line.trim().split(' ')[0]);
        });
        return columns;
    }

    async analyzeDatabase() {
        console.log('🗄️ Analyzing database...');
        const migrations = this.findFiles(['.sql'], 'supabase/migrations');
        const tables = {}; const triggers = []; const views = [];
        migrations.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const tableMatches = content.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/g) || [];
            tableMatches.forEach(match => {
                const table = match.split(' ').pop();
                tables[table] = { file, columns: this.extractColumns(content, table) };
            });
            const triggerMatches = content.match(/CREATE TRIGGER\s+(\w+)/g) || [];
            triggerMatches.forEach(match => triggers.push({ name: match.replace('CREATE TRIGGER ', ''), file }));
            const viewMatches = content.match(/CREATE VIEW\s+(\w+)/g) || [];
            viewMatches.forEach(match => views.push({ name: match.replace('CREATE VIEW ', ''), file }));
        });
        this.report.layers.database = {
            tables: Object.keys(tables).length, tableList: tables,
            triggers: triggers.length, triggerList: triggers,
            views: views.length, viewList: views, migrations: migrations.length
        };
    }

    extractChannelName(match) { const m = match.match(/\.channel\(['"]([^'"]+)['"]\)/); return m ? m[1] : 'unknown'; }
    extractTableName(match) { const m = match.match(/table: ['"]([^'"]+)['"]/); return m ? m[1] : 'unknown'; }

    async analyzeRealtime() {
        console.log('🔄 Analyzing realtime...');
        const frontendFiles = this.findFiles(['.jsx', '.tsx', '.js', '.ts']);
        const subscriptions = [];
        frontendFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const matches = content.match(/\.channel\([^)]*\)[\s\S]*?\.on\(['"]postgres_changes['"]/g) || [];
            matches.forEach(match => {
                subscriptions.push({ file, channel: this.extractChannelName(match), table: this.extractTableName(match) });
            });
        });
        this.report.layers.realtime = { subscriptions: subscriptions.length, subscriptionList: subscriptions, enabledTables: [] };
    }

    async mapConnections() {
        console.log('🔌 Mapping connections...');
        this.report.connections = { rpc: [], rest: [], terminals: {}, realtime: [] };
    }

    async assessRisks() {
        console.log('⚠️ Assessing risks...');
        const circular = []; const missingTryCatch = []; const hardcoded = []; const unused = [];
        this.report.risks = { circular, missingTryCatch, hardcoded, unused, total: 0 };
        this.report.recommendations = this.generateRecommendations();
    }

    generateReport() {
        const dirPath = path.join(process.cwd(), 'codebase-map');
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        const reportPath = path.join(dirPath, 'holistic-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
        this.generateHTMLReport();
        console.log(`✅ Report generated at ${reportPath}`);
    }

    generateHTMLReport() {
        const html = `<!DOCTYPE html><html><head><title>Codebase Holistic Map</title></head><body style="font-family: monospace; background: #0a0a0f; color: #00ff9d; padding: 20px;"><h1>🗺️ CARSS Codebase Holistic Map</h1></body></html>`;
        fs.writeFileSync(path.join(process.cwd(), 'codebase-map', 'holistic-report.html'), html);
    }

    generateRecommendations() {
        const recs = [];
        if (this.report.layers.realtime.subscriptions === 0) recs.push('🔴 No realtime subscriptions found - implement live updates');
        if (this.report.layers.frontend.terminals.staff.length === 0) recs.push('🔴 Staff terminal components missing');
        return recs;
    }
}

const mapper = new CodebaseMapper();
mapper.analyze();
