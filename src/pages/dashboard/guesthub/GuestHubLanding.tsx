import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Utensils, Wine, Calendar } from 'lucide-react';

const GuestHubLanding: React.FC = () => {
    const modules = [
        {
            title: 'Housekeeping',
            description: 'Request room cleaning, towels, or toiletries.',
            icon: Sparkles,
            path: '/dashboard/guest-hub/cleaning',
            color: 'bg-blue-50 text-blue-700',
            borderColor: 'border-blue-100'
        },
        {
            title: 'Room Service',
            description: 'Order food from our restaurant directly to your room.',
            icon: Utensils,
            path: '/dashboard/guest-hub/restaurant',
            color: 'bg-orange-50 text-orange-700',
            borderColor: 'border-orange-100'
        },
        {
            title: 'Bar & Drinks',
            description: 'Chilled drinks, cocktails, and wines.',
            icon: Wine,
            path: '/dashboard/guest-hub/bar',
            color: 'bg-purple-50 text-purple-700',
            borderColor: 'border-purple-100'
        },
        {
            title: 'Reservations',
            description: 'Book a table, event space, or extend your stay.',
            icon: Calendar,
            path: '/dashboard/guest-hub/reservations',
            color: 'bg-emerald-50 text-emerald-700',
            borderColor: 'border-emerald-100'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">Guest Hub</h1>
                <p className="text-gray-500 mt-1">Welcome! How can we make your stay perfect today?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((module) => (
                    <Link
                        key={module.path}
                        to={module.path}
                        className={`block p-6 rounded-2xl border ${module.borderColor} ${module.color} hover:shadow-md transition-all group`}
                    >
                        <div className="flex items-start space-x-4">
                            <div className={`p-3 rounded-xl bg-white/80 shadow-sm group-hover:scale-110 transition-transform`}>
                                <module.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-2">{module.title}</h2>
                                <p className="opacity-90 text-sm leading-relaxed">
                                    {module.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500">
                <p>For urgent matters, please call the front desk at <strong>0800 000 0000</strong>.</p>
            </div>
        </div>
    );
};

export default GuestHubLanding;
