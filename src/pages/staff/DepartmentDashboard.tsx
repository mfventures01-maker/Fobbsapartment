import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
// import { useAuth } from '@/contexts/AuthContext';
import { Bell, CheckCircle, Circle, MessageCircle, Clock, Send, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceRequest {
    id: string;
    type: string;
    department: string;
    status: 'new' | 'in_progress' | 'done';
    payload: any;
    created_at: string;
}

interface Notification {
    id: string;
    content: string; // or message
    created_at: string;
}

const DepartmentDashboard: React.FC<{ department: string }> = ({ department }) => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const whatsappNumber = "+2347048033575";
    const telegramLink = "https://t.me/Captlee77";

    useEffect(() => {
        fetchData();

        // Subscription
        const channel = supabase!
            .channel('service_requests_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `department=eq.${department}`
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    if (payload.eventType === 'INSERT') {
                        setRequests(prev => [payload.new as ServiceRequest, ...prev]);
                        toast.success("New Request Received!");
                        playNotificationSound();
                    } else if (payload.eventType === 'UPDATE') {
                        setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as ServiceRequest : r));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase!.removeChannel(channel);
        };
    }, [department]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Requests
        const { data: reqs, error } = await supabase!
            .from('service_requests')
            .select('*')
            .eq('department', department)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error && error.code !== '42P01') { // Ignore table not found if migration pending
            console.error("Error fetching requests:", error);
        } else if (reqs) {
            setRequests(reqs);
        }

        // Fetch Notifications (Best Effort)
        try {
            const { data: notifs } = await supabase!
                .from('user_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (notifs) setNotifications(notifs);
        } catch (e) {
            // Ignore RLS or missing table errors
            console.warn("Notifications fetch failed (non-critical):", e);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase!
            .from('service_requests')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) toast.error("Failed to update status");
        else toast.success("Status updated");
    };

    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification.mp3'); // Assuming valid path or it fails silently
            audio.play().catch(e => console.log("Audio play failed", e));
        } catch (e) { }
    };

    const getStatusColor = (status: string) => {
        if (status === 'new') return 'bg-red-100 text-red-800 border-red-200';
        if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-green-100 text-green-800 border-green-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 capitalize flex items-center gap-2">
                            <Bell className="w-6 h-6 text-emerald-600" />
                            {department} Dashboard
                        </h1>
                        <p className="text-gray-500 text-sm">Real-time Service Monitor</p>
                    </div>
                    <div className="flex gap-3">
                        <a href={`https://wa.me/${whatsappNumber.replace('+', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                        <a href={telegramLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm">
                            <Send className="w-4 h-4" /> Telegram
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Requests Feed */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Incoming Requests
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">{requests.filter(r => r.status === 'new').length} New</span>
                        </h2>

                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Loading...</div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
                                No active requests.
                            </div>
                        ) : (
                            requests.map(req => (
                                <div key={req.id} className={`bg-white p-5 rounded-2xl border ${req.status === 'new' ? 'border-l-4 border-l-red-500 border-gray-100 shadow-md' : 'border-gray-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${getStatusColor(req.status)}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="font-bold text-gray-900 text-lg capitalize">{req.type}</h3>
                                        <div className="text-gray-600 mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(req.payload, null, 2)}</pre>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 border-t pt-3">
                                        {req.status !== 'done' && (
                                            <button
                                                onClick={() => updateStatus(req.id, 'done')}
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2 rounded-lg hover:bg-emerald-100 font-medium text-sm"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Mark Done
                                            </button>
                                        )}
                                        {req.status === 'new' && (
                                            <button
                                                onClick={() => updateStatus(req.id, 'in_progress')}
                                                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-medium text-sm"
                                            >
                                                <PlayCircle className="w-4 h-4" /> Start
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Notification Feed (Sidebar) */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Recent Notifications</h2>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm max-h-[600px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No recent notifications.</p>
                            ) : (
                                <ul className="space-y-4">
                                    {notifications.map((n, i) => (
                                        <li key={i} className="pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                            <p className="text-sm text-gray-700">{n.content || n.message}</p>
                                            <span className="text-xs text-gray-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DepartmentDashboard;
