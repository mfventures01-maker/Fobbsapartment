import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, ExternalLink } from 'lucide-react';

import ShiftMonitor from '@/components/ShiftMonitor';

const StaffDashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Staff Portal</h1>
                    <p className="text-gray-500">Welcome, {user?.email || 'Staff'}.</p>
                </div>

                <ShiftMonitor />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link to="/dashboard" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                                <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Main Dashboard</h3>
                                <p className="text-sm text-gray-500">Access full notifications and admin tools.</p>
                            </div>
                        </div>
                    </Link>

                    <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-green-50 text-green-700 rounded-xl">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Open WhatsApp Web</h3>
                                <p className="text-sm text-gray-500">Monitor incoming orders.</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
