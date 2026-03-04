import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260304000000_anti_gravity_telemetry.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Strip BEGIN/COMMIT as Supabase RPC exec_sql usually doesn't like them combined if it wraps it
    sql = sql.replace('BEGIN;', '').replace('COMMIT;', '');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        // If exec_sql doesn't exist, we might need another way.
        // But usually I have access or I can try to use a different method.
        console.error('Error running SQL:', error);
    } else {
        console.log('SQL applied successfully:', data);
    }
}

runMigration();
