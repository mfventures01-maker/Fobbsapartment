import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, DollarSign, CreditCard, Activity, Bell } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const OwnerDashboard: React.FC = () => {
    const { profile } = useAuth();
    const title = profile?.role === 'ceo' ? 'CEO Dashboard' : 'Owner Dashboard';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-serif font-bold text-emerald-950">{title}</h1>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Customers"
                    value="1,284"
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Revenue (Mth)"
                    value="₦4.2m"
                    icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="Payments"
                    value="89"
                    icon={<CreditCard className="w-6 h-6 text-purple-600" />}
                    color="bg-purple-50"
                />
                <StatCard
                    title="Active Staff"
                    value="12"
                    icon={<Activity className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
            </div>

            {/* Recent Activity & Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Staff Activity</h3>
                        <Activity className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start space-x-3 pb-3 border-b border-gray-50 last:border-0">
                                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-400"></div>
                                <div>
                                    <p className="text-sm text-gray-800 font-medium">Reception Checked In Guest #{100 + i}</p>
                                    <p className="text-xs text-gray-400">Today, 10:3{i} AM</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Notifications</h3>
                        <Bell className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                            System maintenance scheduled for Sunday 2AM.
                        </div>
                        <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100">
                            3 disputes require your attention.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
