import React from 'react';
import { Sparkles, Trash2, Clock, List } from 'lucide-react';

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

const HousekeepingStaff: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-serif font-bold text-emerald-950">Housekeeping</h1>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">Room Status</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Dirty Rooms"
                    value="4"
                    icon={<Trash2 className="w-6 h-6 text-red-600" />}
                    color="bg-red-50"
                />
                <StatCard
                    title="Cleaned Today"
                    value="12"
                    icon={<Sparkles className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="In Progress"
                    value="2"
                    icon={<Clock className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <List className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-800">Priority Queue</h3>
                </div>
                <div className="space-y-3">
                    {[303, 105, 201].map((room, i) => (
                        <div key={room} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-emerald-50 transition-colors cursor-pointer">
                            <div>
                                <span className="font-bold text-gray-900">Room {room}</span>
                                <span className="text-sm text-gray-500 ml-2">{i === 0 ? '- Check-out Clean' : '- Daily Tidy'}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${i === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                                {i === 0 ? 'Urgent' : 'Pending'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HousekeepingStaff;
