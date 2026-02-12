import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispute {
    id: string;
    payment_id: string;
    status: string;
    reason: string;
    created_at: string;
}

const Disputes: React.FC = () => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDisputes = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('payment_disputes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            toast.error('Error fetching disputes');
        } else {
            setDisputes(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDisputes();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Payment Disputes</h2>
                <button onClick={fetchDisputes} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="px-6 py-4 text-center text-gray-500">Loading disputes...</li>
                    ) : disputes.length === 0 ? (
                        <li className="px-6 py-4 text-center text-gray-500">No disputes found.</li>
                    ) : (
                        disputes.map((dispute) => (
                            <li key={dispute.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full uppercase ${dispute.status === 'open' ? 'bg-orange-100 text-orange-800' :
                                                dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {dispute.status}
                                            </span>
                                            <span className="ml-3 text-sm font-medium text-gray-900">Payment ID: {dispute.payment_id.slice(0, 8)}...</span>
                                        </div>
                                        <div className="text-sm text-gray-700 mt-2 font-medium">Reason: {dispute.reason}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Opened: {new Date(dispute.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {/* Admin actions to resolve disputes could be added here similar to Payments */}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Disputes;
