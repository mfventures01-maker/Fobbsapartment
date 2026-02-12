import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this matches your actual client export
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserNotification {
    id: string;
    title: string;
    message: string;
    created_at: string;
    read_at: string | null;
}

const DashboardHome: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user || !supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error(error);
            toast.error('Failed to load notifications');
        } else {
            setNotifications(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const markAsRead = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast.error('Could not mark as read');
        } else {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            toast.success('Marked as read');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Notification Inbox
                    </h3>
                    <button onClick={fetchNotifications} className="text-sm text-emerald-600 hover:text-emerald-900">
                        Refresh
                    </button>
                </div>
                <div className="border-t border-gray-200">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No notifications found.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {notifications.map((notification) => (
                                <li key={notification.id} className={`px-4 py-4 sm:px-6 hover:bg-gray-50 transition ${notification.read_at ? 'opacity-75' : 'bg-blue-50/30'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start spaces-x-3">
                                            <div className="flex-shrink-0 mt-1 mr-3">
                                                <Bell className={`h-5 w-5 ${notification.read_at ? 'text-gray-400' : 'text-emerald-600 fill-current'}`} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${notification.read_at ? 'text-gray-900' : 'text-emerald-900 font-bold'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                                                <div className="flex items-center mt-2 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        {!notification.read_at && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="ml-4 flex-shrink-0 p-2 text-gray-400 hover:text-emerald-600"
                                                title="Mark as Read"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
