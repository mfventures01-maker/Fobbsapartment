import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicRequest } from '@/hooks/usePublicRequest';
import {
    buildHousekeepingMessage,
    buildReservationMessage,
    buildTransportMessage,
    buildLaundryMessage
} from '@/lib/channelRouting';
import { ArrowLeft, Send } from 'lucide-react';
import { HOTEL_CONFIG } from '@/config/cars.config';

const ServiceRequestPublic: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const { sendRequest } = usePublicRequest();

    // Common State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [room, setRoom] = useState(''); // Optional mostly
    const [notes, setNotes] = useState('');
    const [time, setTime] = useState('');

    // Cleaning Specific
    const [cleaningType, setCleaningType] = useState('Clean My Room');

    // Reservation Specific
    const [resType, setResType] = useState('Restaurant Table');
    const [date, setDate] = useState('');
    const [guests, setGuests] = useState(2);

    // Transport Specific
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');

    // Laundry Specific
    const [itemsSummary, setItemsSummary] = useState('');

    const handleSubmit = (channel: 'whatsapp' | 'telegram') => {
        if (!name || !phone) {
            alert('Please provide your name and phone number.');
            return;
        }

        let builder = buildHousekeepingMessage;
        let title = 'Service Request';
        let payload: any = {
            guest_name: name,
            phone,
            room_number: room || 'Not Provided',
            notes,
            time
        };

        switch (type) {
            case 'cleaning':
                title = 'Housekeeping Request';
                builder = buildHousekeepingMessage;
                payload = { ...payload, requests: [cleaningType] };
                break;
            case 'reservations':
                title = 'Reservation Request';
                builder = buildReservationMessage;
                payload = { ...payload, type: resType, date, guests };
                break;
            case 'transport':
                title = 'Transport Request';
                builder = buildTransportMessage;
                payload = { ...payload, pickup_location: pickup, destination, type: 'Transport' };
                break;
            case 'laundry':
                title = 'Laundry Request';
                builder = buildLaundryMessage;
                payload = { ...payload, items_summary: itemsSummary };
                break;
            default:
                return;
        }

        sendRequest(
            title,
            builder,
            payload,
            channel,
            type === 'reservations' || type === 'transport' ? 'frontdesk' : 'frontdesk'
        );
    };

    const renderForm = () => {
        switch (type) {
            case 'cleaning':
                return (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                                <select
                                    value={cleaningType}
                                    onChange={(e) => setCleaningType(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                >
                                    {HOTEL_CONFIG.hotel.housekeeping.requests.map(r => (
                                        <option key={r.id} value={r.label}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                                <input
                                    type="text"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    placeholder="e.g. Now, 10am, etc."
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                        </div>
                    </>
                );
            case 'reservations':
                return (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Type</label>
                                <select
                                    value={resType}
                                    onChange={(e) => setResType(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                >
                                    <option value="Restaurant Table">Restaurant Table</option>
                                    <option value="Event Space">Event Space</option>
                                    <option value="Extend Stay">Extend Room Stay</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                                <select
                                    value={guests}
                                    onChange={(e) => setGuests(Number(e.target.value))}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n} People</option>)}
                                </select>
                            </div>
                        </div>
                    </>
                );
            case 'transport':
                return (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                                <input
                                    type="text"
                                    value={pickup}
                                    onChange={(e) => setPickup(e.target.value)}
                                    placeholder="e.g. Airport, Hotel Lobby"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="e.g. City Center"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
                                <input
                                    type="datetime-local"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                        </div>
                    </>
                );
            case 'laundry':
                return (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
                                <input
                                    type="datetime-local"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Items Summary</label>
                                <textarea
                                    value={itemsSummary}
                                    onChange={(e) => setItemsSummary(e.target.value)}
                                    placeholder="e.g. 2 shirts, 1 trouser"
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                        </div>
                    </>
                );
            default:
                return <div className="text-red-500">Service not found</div>;
        }
    };

    const getTitle = () => {
        if (!type) return 'Service';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-4">
                    <Link to="/services" className="p-2 bg-white shadow-sm hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{getTitle()} Request</h1>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                    {/* Common Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                placeholder="Guest Name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                    placeholder="080..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room No.</label>
                                <input
                                    type="text"
                                    value={room}
                                    onChange={(e) => setRoom(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        {renderForm()}
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                placeholder="Any special requests?"
                                rows={2}
                            />
                        </div>

                        <div className="pt-2 space-y-3">
                            <button
                                onClick={() => handleSubmit('whatsapp')}
                                className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20bd5a] flex items-center justify-center space-x-2 shadow-lg shadow-green-100"
                            >
                                <Send className="w-5 h-5" />
                                <span>Request via WhatsApp</span>
                            </button>
                            {HOTEL_CONFIG.channels.telegram_handle && (
                                <button
                                    onClick={() => handleSubmit('telegram')}
                                    className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold hover:bg-[#0077b5] flex items-center justify-center space-x-2 shadow-lg shadow-blue-100"
                                >
                                    <Send className="w-5 h-5" />
                                    <span>Request via Telegram</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceRequestPublic;
