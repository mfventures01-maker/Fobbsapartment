import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Car, Calendar, Shirt, ArrowLeft } from 'lucide-react';

const ServicesHubPublic: React.FC = () => {
    const services = [
        {
            title: 'Housekeeping',
            description: 'Request room cleaning, fresh towels, or toiletries.',
            icon: Sparkles,
            path: '/services/cleaning',
            color: 'bg-blue-50 text-blue-700',
            borderColor: 'border-blue-100'
        },
        {
            title: 'Reservations',
            description: 'Book a table, event space, or extend your stay.',
            icon: Calendar,
            path: '/services/reservations',
            color: 'bg-emerald-50 text-emerald-700',
            borderColor: 'border-emerald-100'
        },
        {
            title: 'Transport',
            description: 'Airport pickup, drop-off, or city transit.',
            icon: Car,
            path: '/services/transport',
            color: 'bg-orange-50 text-orange-700',
            borderColor: 'border-orange-100'
        },
        {
            title: 'Laundry',
            description: 'Wash, dry, and fold service.',
            icon: Shirt,
            path: '/services/laundry',
            color: 'bg-purple-50 text-purple-700',
            borderColor: 'border-purple-100'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center space-x-4">
                    <Link to="/" className="p-2 bg-white shadow-sm hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Guest Services</h1>
                        <p className="text-gray-500 mt-1">How can we make your stay perfect today?</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((service) => (
                        <Link
                            key={service.path}
                            to={service.path}
                            className={`block p-6 rounded-2xl border ${service.borderColor} ${service.color} hover:shadow-md transition-all group bg-white`}
                        >
                            <div className="flex items-start space-x-4">
                                <div className={`p-3 rounded-xl bg-opacity-20 shadow-sm group-hover:scale-110 transition-transform ${service.color.replace('text-', 'bg-')}`}>
                                    <service.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-2 text-gray-900">{service.title}</h2>
                                    <p className="opacity-90 text-sm leading-relaxed text-gray-600">
                                        {service.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="p-6 bg-white rounded-xl border border-gray-200 text-center shadow-sm">
                    <p className="text-gray-500">
                        Prefer to talk? Call the Front Desk at <a href="tel:08000000000" className="font-bold text-emerald-700 hover:underline">0800 000 0000</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServicesHubPublic;
