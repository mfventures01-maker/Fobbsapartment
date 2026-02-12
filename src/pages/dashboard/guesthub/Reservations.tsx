import React, { useState } from 'react';
import { useGuestHubRequest } from './useGuestHub';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildReservationMessage } from '@/lib/channelRouting';
import { Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Reservations: React.FC = () => {
    const { sendRequest } = useGuestHubRequest();
    const { user } = useAuth(); // Potentially use profile name if available, but AuthContext types are strict

    // Default today/now
    const today = new Date().toISOString().split('T')[0];

    const [type, setType] = useState('Restaurant Table');
    const [date, setDate] = useState(today);
    const [time, setTime] = useState('19:00');
    const [guests, setGuests] = useState(2);
    const [notes, setNotes] = useState('');

    const handleSubmit = (channel: 'whatsapp' | 'telegram') => {
        sendRequest(
            'RESERVATION_REQUEST',
            'Reservation Request',
            buildReservationMessage,
            {
                type,
                date,
                time,
                guests,
                guest_name: user?.email || "Guest", // Fallback to email if no name prop readily available without extra fetch
                notes,
                summary: `${type} for ${guests} on ${date} @ ${time}`
            },
            channel
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 mb-8">
                <Link to="/dashboard/guest-hub" className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reservation Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="Restaurant Table">Restaurant Table</option>
                        <option value="Event Space">Event Space</option>
                        <option value="Extend Stay">Extend Room Stay</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
                    <select
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value))}
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(n => (
                            <option key={n} value={n}>{n} People</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special requests?"
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        onClick={() => handleSubmit('whatsapp')}
                        className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2"
                    >
                        <Send className="w-5 h-4" />
                        <span>Request via WhatsApp</span>
                    </button>
                    {HOTEL_CONFIG.channels.telegram_handle && (
                        <button
                            onClick={() => handleSubmit('telegram')}
                            className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0077b5] flex items-center justify-center space-x-2"
                        >
                            <Send className="w-5 h-4" />
                            <span>Request via Telegram</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reservations;
