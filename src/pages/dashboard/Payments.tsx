import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, AlertOctagon, Scale, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Payment {
    id: string;
    amount_ngn: number;
    status: string;
    customer_reference: string;
    created_at: string;
}

const Payments: React.FC = () => {
    const { profile } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPayments = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            toast.error('Error fetching payments');
        } else {
            setPayments(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const isAdmin = profile?.role === 'owner' || profile?.role === 'ceo' || profile?.role === 'manager';

    const verifyPayment = async (id: string) => {
        if (!isAdmin || !supabase) return toast.error('You do not have permission.');
        const { error } = await supabase.rpc('verify_payment', { payment_id: id });
        if (error) toast.error(error.message);
        else {
            toast.success('Payment verified');
            fetchPayments();
        }
    };

    const reversePayment = async (id: string) => {
        if (!isAdmin || !supabase) return toast.error('You do not have permission.');
        // Prompt for reason for simplicity, typically a modal
        const reason = prompt('Enter reason for reversal:');
        if (!reason) return;

        const { error } = await supabase.rpc('reverse_payment', { payment_id: id, reason });
        if (error) toast.error(error.message);
        else {
            toast.success('Payment reversed');
            fetchPayments();
        }
    };

    const openDispute = async (id: string) => {
        if (!isAdmin || !supabase) return toast.error('You do not have permission.');
        const reason = prompt('Enter reason for dispute:');
        if (!reason) return;

        const { error } = await supabase.rpc('open_payment_dispute', { payment_id: id, reason });
        if (error) toast.error(error.message);
        else {
            toast.success('Dispute open');
            fetchPayments();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
                <button onClick={fetchPayments} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="px-6 py-4 text-center text-gray-500">Loading payments...</li>
                    ) : payments.length === 0 ? (
                        <li className="px-6 py-4 text-center text-gray-500">No payments found.</li>
                    ) : (
                        payments.map((payment) => (
                            <li key={payment.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between overflow-x-auto">
                                <div>
                                    <div className="flex items-center">
                                        <span className="text-lg font-bold text-gray-900">₦{payment.amount_ngn.toLocaleString()}</span>
                                        <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'verified' ? 'bg-green-100 text-green-800' :
                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                payment.status === 'reversed' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Ref: {payment.customer_reference || 'N/A'} • {new Date(payment.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex space-x-2 ml-4">
                                        {payment.status === 'pending' && (
                                            <button onClick={() => verifyPayment(payment.id)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Verify">
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                        {payment.status === 'verified' && (
                                            <button onClick={() => reversePayment(payment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Reverse">
                                                <AlertOctagon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => openDispute(payment.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Dispute">
                                            <Scale className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Payments;
