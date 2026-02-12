import React from 'react';
import { Utensils, Clock, DollarSign, Bell } from 'lucide-react';

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

const RestaurantStaff: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-serif font-bold text-emerald-950">Restaurant Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1 sm:mt-0">Kitchen & Service View</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Active Orders"
                    value="8"
                    icon={<Utensils className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="Avg Prep Time"
                    value="24m"
                    icon={<Clock className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Daily Sales"
                    value="₦85k"
                    icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-50"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-800">Latest Orders</h3>
                </div>
                <div className="space-y-3">
                    {[101, 102, 103].map(order => (
                        <div key={order} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <span className="font-bold text-gray-900">Order #{order}</span>
                                <span className="text-sm text-gray-500 ml-2">- Room 20{order - 100}</span>
                            </div>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Cooking</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RestaurantStaff;
