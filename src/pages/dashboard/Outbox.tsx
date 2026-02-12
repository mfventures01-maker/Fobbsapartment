import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, Play, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface OutboxItem {
    id: string;
    channel: string;
    status: string;
    to_address: string;
    details: any;
    attempts: number;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
}

const Outbox: React.FC = () => {
    const [outbox, setOutbox] = useState<OutboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchOutbox = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('notification_outbox')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            toast.error('Error fetching outbox');
        } else {
            setOutbox(data || []);
        }
        setLoading(false);
    };

    const triggerSendOutbox = async () => {
        if (!supabase) return;
        setProcessing(true);
        const loadingToast = toast.loading('Invoking Edge Function...');

        try {
            const { data, error } = await supabase.functions.invoke('send-outbox', {
                body: {},
            });

            if (error) {
                console.error('Edge Function Error:', error);
                toast.error(`Invocation failed: ${error.message}`, { id: loadingToast });
            } else {
                console.log('Edge Function Response:', data);
                toast.success(`Processed: ${data?.processed ?? 'Unknown'}`, { id: loadingToast });
                fetchOutbox();
            }
        } catch (err: any) {
            toast.error(`Client error: ${err.message}`, { id: loadingToast });
        } finally {
            setProcessing(false);
        }
    };

    // Test Trigger helper
    const triggerTestAlert = async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('queue_ceo_alert', {
            message_text: "Test detailed alert from Admin Dashboard.",
            context_data: { source: "dashboard_test" }
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Test alert queued!");
            fetchOutbox();
        }
    };

    useEffect(() => {
        fetchOutbox();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Admin Outbox Monitor</h2>
                <div className="flex gap-2">
                    <button
                        onClick={triggerTestAlert}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-bold text-sm hover:bg-gray-200"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" /> Queue Test Alert
                    </button>
                    <button
                        onClick={triggerSendOutbox}
                        disabled={processing}
                        className="flex items-center px-4 py-2 bg-emerald-900 text-white rounded-md font-bold text-sm hover:bg-emerald-800 disabled:opacity-50"
                    >
                        <Play className="w-4 h-4 mr-2" /> {processing ? 'Running...' : 'Run Send-Outbox'}
                    </button>
                    <button onClick={fetchOutbox} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading outbox...</td></tr>
                        ) : outbox.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Outbox is empty.</td></tr>
                        ) : (
                            outbox.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full uppercase ${item.status === 'sent' ? 'bg-green-100 text-green-800' :
                                            item.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                item.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.status}
                                        </span>
                                        {item.attempts > 0 && <span className="ml-1 text-xs text-gray-400">({item.attempts})</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{item.channel}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{item.to_address}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 max-w-xs truncate" title={item.last_error || ''}>
                                        {item.last_error || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Outbox;
