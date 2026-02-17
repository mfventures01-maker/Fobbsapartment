import React from 'react';
import { TrendingUp, ClipboardList, Wallet } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const ManagerDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-serif font-bold text-emerald-950">Manager Overview</h1>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">{new Date().toLocaleDateString()}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Active Guests"
                    value="42"
                    icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="Pending Tasks"
                    value="5"
                    icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Check-ins (Today)"
                    value="8"
                    icon={<Wallet className="w-6 h-6 text-purple-600" />}
                    color="bg-purple-50"
                />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800 text-lg">Operational Requests</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Live Feed</span>
                </div>
                {/* Request List */}
                <div className="space-y-4">
                    {[
                        { id: 1, room: '301', type: 'Room Service', time: '5 mins ago' },
                        { id: 2, room: '102', type: 'Housekeeping', time: '12 mins ago' },
                        { id: 3, room: '205', type: 'Maintenance', time: '20 mins ago' },
                        { id: 4, room: '404', type: 'Bell Hop', time: '35 mins ago' }
                    ].map((req) => (
                        <div key={req.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {req.room}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{req.type} Request</p>
                                    <p className="text-xs text-gray-500">Room {req.room} - {req.time}</p>
                                </div>
                            </div>
                            <button className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-center">
                    <button className="text-sm text-gray-500 hover:text-emerald-600 font-medium transition-colors">
                        View All Activity &rarr;
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ManagerDashboard;
