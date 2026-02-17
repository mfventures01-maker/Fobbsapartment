import React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Phase 2: Replace mock data with supabase.from("audit_logs") + realtime

const CeoAuditFeed: React.FC = () => {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // Fetch from updated schema 'transaction_logs'
        // If not exists yet, we fallback to empty
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('transaction_logs')
                .select('*, profiles:actor_id(full_name)')
                .order('timestamp', { ascending: false })
                .limit(20);
            if (data) setLogs(data);
            setLoading(false);
        };
        fetchLogs();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-400">Loading audit trail...</div>;

    if (logs.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 font-bold">IMMUTABLE LEDGER INITIALIZED</p>
                <p className="text-xs text-gray-300 mt-2">Waiting for first transaction event...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
                <p className="text-sm text-gray-500">Immutable ledger of financial actions.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <th className="px-6 py-4 font-semibold">Action</th>
                            <th className="px-6 py-4 font-semibold">User</th>
                            <th className="px-6 py-4 font-semibold">Details</th>
                            <th className="px-6 py-4 font-semibold">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900 border-l-4 border-emerald-500 pl-5">
                                    {log.action?.toUpperCase() || 'EVENT'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                    {log.profiles?.full_name || log.actor_id?.slice(0, 8) || 'SYSTEM'}
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                    {JSON.stringify(log.new_state || {})}
                                </td>
                                <td className="px-6 py-4 text-gray-400 text-xs">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CeoAuditFeed;
