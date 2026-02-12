import React, { useState } from 'react';
import { useGuestHubRequest } from './useGuestHub';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { buildHousekeepingMessage } from '@/lib/channelRouting';
import { Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cleaning: React.FC = () => {
    const { sendRequest } = useGuestHubRequest();
    const [requestType, setRequestType] = useState(HOTEL_CONFIG.hotel.housekeeping.requests[0].label);
    const [time, setTime] = useState('Now');
    const [notes, setNotes] = useState('');

    const handleSubmit = (channel: 'whatsapp' | 'telegram') => {
        sendRequest(
            'CLEANING_REQUEST',
            'Housekeeping Request',
            buildHousekeepingMessage,
            {
                requests: [requestType],
                notes: `Time: ${time}. ${notes}`,
                summary: `${requestType} (${time})`
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
                <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Required</label>
                    <select
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {HOTEL_CONFIG.hotel.housekeeping.requests.map(req => (
                            <option key={req.id} value={req.label}>{req.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                    <select
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="Now">Right Now</option>
                        <option value="In 30 mins">In 30 mins</option>
                        <option value="In 1 hour">In 1 hour</option>
                        <option value="Morning (Tomorrow)">Morning (Tomorrow)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any specific instructions?"
                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        onClick={() => handleSubmit('whatsapp')}
                        className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2"
                    >
                        <Send className="w-5 h-5" />
                        <span>Request via WhatsApp</span>
                    </button>
                    {HOTEL_CONFIG.channels.telegram_handle && (
                        <button
                            onClick={() => handleSubmit('telegram')}
                            className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0077b5] flex items-center justify-center space-x-2"
                        >
                            <Send className="w-5 h-5" />
                            <span>Request via Telegram</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Cleaning;
