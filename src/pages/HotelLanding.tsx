import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HOTEL_CONFIG, Room } from '@/config/cars.config';
import { getWhatsAppTargetNumber, buildHotelBookingMessage, openWhatsApp, openTelegram, BookingForm, calculateNights } from '@/lib/channelRouting';
import { logLeadOrBooking } from '@/lib/logging';
import { generateBookingId } from '@/lib/ids';
import { Users, Wifi, Wind, MapPin, MessageSquare, X, Send, Calendar, User, Phone, FileText, ChevronLeft, Bell, Star, ArrowRight, Utensils, ShieldCheck, Wine, Lock } from 'lucide-react';


const HotelLanding: React.FC = () => {
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [generatedId, setGeneratedId] = useState<string>('');

    const [formData, setFormData] = useState<BookingForm>({
        guestName: '',
        phone: '',
        checkIn: '',
        checkOut: '',
        guests: 1,
        notes: ''
    });

    const handleBookClick = (room: Room) => {
        setSelectedRoom(room);
        setIsModalOpen(true);
        setShowConfirmation(false);
        setGeneratedId('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowConfirmation(false);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;

        // Generate ID only once per session/attempt
        const newId = generateBookingId(HOTEL_CONFIG.business_code);
        setGeneratedId(newId);

        setShowConfirmation(true);
    };

    const handleEditDetails = () => {
        setShowConfirmation(false);
        // ID is preserved if they come back, or we could regenerate. 
        // Keeping it is better for UX if they just fix a typo.
    };

    const handleConfirmAndSend = (channel: 'whatsapp' | 'telegram') => {
        if (!selectedRoom) return;

        const finalFormData = { ...formData, bookingId: generatedId };
        const msg = buildHotelBookingMessage(finalFormData, selectedRoom);

        const nights = calculateNights(formData.checkIn, formData.checkOut);
        const total = selectedRoom.pricePerNight * nights;

        // Log the official attempt
        logLeadOrBooking({
            booking_id: generatedId,
            customer_name: formData.guestName,
            customer_phone: formData.phone,
            item_name: selectedRoom.name,
            total_value: total,
            business_type: HOTEL_CONFIG.business_type,
            metadata: {
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                guests: formData.guests,
                nights,
                channel
            }
        });

        if (channel === 'whatsapp') {
            openWhatsApp(getWhatsAppTargetNumber('frontdesk'), msg);
        } else if (channel === 'telegram' && HOTEL_CONFIG.channels.telegram_handle) {
            openTelegram(HOTEL_CONFIG.channels.telegram_handle, msg);
        }

        // Optional: Close modal or show "Sent" state. 
        // For v1, we leave it open so they can retry if popup blocked, 
        // or manually close.
    };

    const today = new Date().toISOString().split('T')[0];
    const nights = calculateNights(formData.checkIn, formData.checkOut);
    const totalEst = selectedRoom ? selectedRoom.pricePerNight * nights : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section */}
            <div className="relative h-[60vh] md:h-[500px] w-full overflow-hidden">
                <div className="absolute inset-0 bg-black/40 z-10"></div>
                <img
                    src={HOTEL_CONFIG.hero_image}
                    alt={HOTEL_CONFIG.business_name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-2 shadow-sm">
                        {HOTEL_CONFIG.business_name}
                    </h1>
                    <div className="flex items-center text-white/90 font-medium space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                        <MapPin className="w-4 h-4" />
                        <span>{HOTEL_CONFIG.location}</span>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Link to="/restaurant" className="min-w-[140px] px-6 py-3 bg-white text-emerald-900 font-bold rounded-full shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center">
                            <Utensils className="w-4 h-4 mr-2" /> Restaurant
                        </Link>
                        <Link to="/bar" className="min-w-[140px] px-6 py-3 bg-emerald-900 text-white font-bold rounded-full shadow-lg hover:bg-emerald-800 transition-all flex items-center justify-center border border-emerald-700">
                            <Wine className="w-4 h-4 mr-2" /> Bar
                        </Link>
                        <Link to="/services" className="min-w-[140px] px-6 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center backdrop-blur-sm bg-opacity-90">
                            <Bell className="w-4 h-4 mr-2" /> Services
                        </Link>
                    </div>
                </div>
            </div>

            {/* Rooms Grid */}
            <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-30">
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 mb-12">
                    {/* Guest Hub Promo (Updated Link) */}
                    <div className="mb-10 p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 rounded-[2rem] border border-emerald-700/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-emerald-900/40 transform hover:scale-[1.01] transition-all">
                        <div className="flex items-center space-x-6 text-center sm:text-left">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 mx-auto sm:mx-0 border border-white/20">
                                <Bell className="w-7 h-7 animate-pulse" />
                            </div>
                            <div>
                                <div className="font-serif font-bold text-white text-xl mb-1">Already Checked In?</div>
                                <div className="text-emerald-100/70 text-sm">Order room service, request cleaning, and more through your personal portal.</div>
                            </div>
                        </div>
                        <Link to="/services" className="px-8 py-4 bg-white text-emerald-900 text-sm font-bold rounded-2xl shadow-xl hover:bg-emerald-50 active:scale-95 transition-all w-full sm:w-auto text-center">
                            Open Guest Hub
                        </Link>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Available Suites</h2>
                        <div className="text-sm text-gray-500 hidden sm:block">Select a room to view details</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {HOTEL_CONFIG.rooms.map(room => (
                            <div key={room.id} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
                                <div className="relative h-64 overflow-hidden">
                                    <img
                                        src={room.images[0]}
                                        alt={room.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-900 shadow-sm">
                                        {room.type}
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{room.name}</h3>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {room.maxGuests} Guests</span>
                                            <span className="flex items-center"><Wind className="w-3 h-3 mr-1" /> AC</span>
                                            <span className="flex items-center"><Wifi className="w-3 h-3 mr-1" /> WiFi</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-500 text-sm line-clamp-2">{room.description}</p>

                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div>
                                            <span className="text-2xl font-bold text-emerald-900">₦{room.pricePerNight.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400 font-medium"> / night</span>
                                        </div>
                                        <button
                                            onClick={() => handleBookClick(room)}
                                            className="px-6 py-2 bg-emerald-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-colors"
                                        >
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Services Section */}
            {HOTEL_CONFIG.services_section && (
                <div id="services" className="max-w-7xl mx-auto px-4 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3 font-serif">{HOTEL_CONFIG.services_section.title}</h2>
                        <p className="text-gray-500">{HOTEL_CONFIG.services_section.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {HOTEL_CONFIG.services_section.items.map((service) => (
                            <div key={service.key} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                                <div className="h-48 overflow-hidden">
                                    <img src={service.image_url} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                                    <p className="text-gray-500 text-sm mb-4">{service.description}</p>
                                    <Link to={service.route_target} className="inline-flex items-center text-emerald-900 font-bold text-sm hover:text-emerald-700">
                                        Open Service <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Restaurant Section */}
            {HOTEL_CONFIG.restaurant_section && (
                <div id="restaurant" className="bg-emerald-900 text-white py-20 mb-20 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/20 z-0"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-block bg-emerald-800/50 px-4 py-1 rounded-full text-emerald-100 text-xs font-bold uppercase tracking-wider border border-emerald-700">
                                    Dining
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
                                    {HOTEL_CONFIG.restaurant_section.title}
                                </h2>
                                <p className="text-emerald-100/80 text-lg">
                                    {HOTEL_CONFIG.restaurant_section.subtitle}
                                </p>
                                <ul className="space-y-3">
                                    {HOTEL_CONFIG.restaurant_section.highlights.map((highlight, idx) => (
                                        <li key={idx} className="flex items-center space-x-3 text-emerald-50">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Utensils className="w-3 h-3 text-emerald-300" />
                                            </div>
                                            <span>{highlight}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-4">
                                    <Link to={HOTEL_CONFIG.restaurant_section.cta_route} className="inline-flex items-center px-8 py-4 bg-white text-emerald-900 rounded-xl font-bold shadow-lg hover:bg-gray-100 transition-colors">
                                        {HOTEL_CONFIG.restaurant_section.cta_text}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Link>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-emerald-500/20 rounded-3xl transform rotate-3 blur-sm"></div>
                                <img
                                    src={HOTEL_CONFIG.restaurant_section.hero_image_url}
                                    alt="Restaurant"
                                    className="relative rounded-2xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 border border-white/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            {HOTEL_CONFIG.reviews && (
                <div id="reviews" className="max-w-7xl mx-auto px-4 mb-20">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 font-serif">Guest Reviews</h2>
                            <p className="text-gray-500">What our guests are saying.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {HOTEL_CONFIG.reviews.slice(0, 3).map((review, i) => (
                            <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 relative shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex text-emerald-500 mb-4">
                                    {[...Array(5)].map((_, starI) => (
                                        <Star key={starI} className={`w-4 h-4 ${starI < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                <p className="text-gray-700 mb-6 italic">"{review.text}"</p>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-emerald-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {review.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{review.name}</div>
                                        <div className="text-xs text-gray-500">{review.city} • <span className="text-emerald-700 font-bold bg-emerald-100 px-1 rounded">Verified</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {isModalOpen && selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">
                                {showConfirmation ? 'Confirm Reservation' : 'Complete Your Booking'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[80vh] overflow-y-auto">
                            {!showConfirmation ? (
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    <div className="flex items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                                        <img src={selectedRoom.images[0]} className="w-16 h-16 rounded-xl object-cover mr-4" alt="Room" />
                                        <div>
                                            <div className="font-bold text-emerald-900">{selectedRoom.name}</div>
                                            <div className="text-xs text-emerald-700">₦{selectedRoom.pricePerNight.toLocaleString()} / night</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Check In</label>
                                            <input
                                                required
                                                type="date"
                                                min={today}
                                                className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 border-none focus:ring-2 focus:ring-emerald-500"
                                                value={formData.checkIn}
                                                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Check Out</label>
                                            <input
                                                required
                                                type="date"
                                                min={formData.checkIn || today}
                                                className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 border-none focus:ring-2 focus:ring-emerald-500"
                                                value={formData.checkOut}
                                                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. John Doe"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-medium border-none focus:ring-2 focus:ring-emerald-500"
                                                value={formData.guestName}
                                                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                required
                                                type="tel"
                                                placeholder="e.g. 0803 000 0000"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-medium border-none focus:ring-2 focus:ring-emerald-500"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Guests</label>
                                            <select
                                                className="w-full p-3 bg-gray-50 rounded-xl font-medium border-none focus:ring-2 focus:ring-emerald-500"
                                                value={formData.guests}
                                                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                                            >
                                                {[...Array(selectedRoom.maxGuests)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1} Guest{i !== 0 && 's'}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Notes (Optional)</label>
                                        <textarea
                                            rows={2}
                                            className="w-full p-3 bg-gray-50 rounded-xl font-medium border-none focus:ring-2 focus:ring-emerald-500"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-emerald-900 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all mt-4 flex items-center justify-center space-x-2"
                                    >
                                        <span>Continue</span>
                                        <User className="w-4 h-4" />
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                                        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Booking ID</span>
                                            <span className="font-mono font-bold text-emerald-900 text-lg">{generatedId}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Check In</p>
                                                <div className="flex items-center space-x-2 text-emerald-900 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formData.checkIn}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Check Out</p>
                                                <div className="flex items-center space-x-2 text-emerald-900 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formData.checkOut}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-emerald-100 pt-3">
                                            <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total Estimate</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-emerald-900 font-medium">{nights} Night{nights > 1 ? 's' : ''} x ₦{selectedRoom.pricePerNight.toLocaleString()}</span>
                                                <span className="text-2xl font-bold text-emerald-900">₦{totalEst.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div className="text-sm text-gray-600">
                                                <span className="font-bold text-gray-900 block mb-1">Guest Details</span>
                                                {formData.guestName} <br />
                                                {formData.phone} <br />
                                                <span className="italic text-xs text-gray-500">{formData.notes || "No special requests"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <button
                                            onClick={() => handleConfirmAndSend('whatsapp')}
                                            className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-[#20bd5a] transition-all flex items-center justify-center space-x-2"
                                        >
                                            <Send className="w-5 h-5" />
                                            <span>Confirm & Send to WhatsApp</span>
                                        </button>

                                        {HOTEL_CONFIG.channels.telegram_handle && (
                                            <button
                                                onClick={() => handleConfirmAndSend('telegram')}
                                                className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0077b5] transition-all flex items-center justify-center space-x-2"
                                            >
                                                <Send className="w-5 h-5" />
                                                <span>Confirm & Send to Telegram</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleEditDetails}
                                            className="w-full py-3 text-gray-500 font-bold hover:text-gray-900 flex items-center justify-center space-x-2"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Edit Details</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Footer */}
            <div className="bg-emerald-950 text-emerald-400 py-12 px-4 mt-12">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm">
                    <div className="mb-4 md:mb-0">
                        &copy; {new Date().getFullYear()} {HOTEL_CONFIG.business_name}.
                    </div>
                    <Link to="/staff-login" className="flex items-center text-emerald-600 hover:text-emerald-400 font-bold transition-colors">
                        <Lock className="w-3 h-3 mr-1" /> Staff Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HotelLanding;
