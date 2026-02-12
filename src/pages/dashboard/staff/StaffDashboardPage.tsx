import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckSquare, Clock, Bell, ArrowRight } from 'lucide-react';

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

const StaffDashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const title = profile?.department
        ? `${profile.department.charAt(0).toUpperCase() + profile.department.slice(1)} Dashboard`
        : 'Staff Dashboard';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-serif font-bold text-emerald-950">{title}</h1>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">{profile?.full_name || 'Staff Member'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="My Tasks"
                    value="3"
                    icon={<Clock className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="Today Handled"
                    value="15"
                    icon={<CheckSquare className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="Notifications"
                    value="2"
                    icon={<Bell className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Current Assignments</h3>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Active</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 w-2 h-2 rounded-full ${i === 1 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {i === 1 ? 'Urgent Request: Room 204' : `Routine Check: Area ${i}`}
                                    </p>
                                    <p className="text-xs text-gray-500">Assigned 30 mins ago</p>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-emerald-600">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 text-center">
                    <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                        View Completed Tasks
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboardPage;
