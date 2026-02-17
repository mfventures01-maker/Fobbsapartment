import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    icon?: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendDirection = 'neutral', icon: Icon }) => {
    return (
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                {Icon && (
                    <div className="p-2 bg-gray-50 rounded-lg">
                        <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </div>
            {trend && (
                <div className="flex items-center text-sm">
                    <span
                        className={`font-medium ${trendDirection === 'up'
                                ? 'text-emerald-600'
                                : trendDirection === 'down'
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                            }`}
                    >
                        {trend}
                    </span>
                    <span className="ml-2 text-gray-400">vs last month</span>
                </div>
            )}
        </div>
    );
};

export default StatCard;
