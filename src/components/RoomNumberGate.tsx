
import React, { useState, useEffect } from 'react';
import { HOTEL_CONFIG } from '@/config/cars.config';
import { DoorOpen, ArrowRight, RotateCcw } from 'lucide-react';

interface RoomNumberGateProps {
    onGatePassed: (roomNumber: string) => void;
}

export const RoomNumberGate: React.FC<RoomNumberGateProps> = ({ onGatePassed }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('carss_room_number');
        if (stored) {
            onGatePassed(stored);
        }
    }, [onGatePassed]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = input.trim().toUpperCase();
        if (cleaned.length < 1) {
            setError('Please enter a valid room number.');
            return;
        }

        // Simple format check (alphanumeric, max 6 chars)
        if (!/^[A-Z0-9-]{1,6}$/.test(cleaned)) {
            setError('Invalid format. Example: 205, A12, 101.');
            return;
        }

        sessionStorage.setItem('carss_room_number', cleaned);
        onGatePassed(cleaned);
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <DoorOpen className="w-6 h-6" />
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-900">Guest Access</h3>
                <p className="text-sm text-gray-400">Enter your room number to access hotel services.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="text"
                    placeholder="Room Number (e.g. 101)"
                    className="w-full text-center text-xl font-bold tracking-widest p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 uppercase placeholder:normal-case placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setError('');
                    }}
                    maxLength={6}
                />

                {error && <p className="text-xs text-red-500 font-bold animate-pulse">{error}</p>}

                <button
                    type="submit"
                    className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                    <span>Enter Hub</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};

export const ChangeRoomButton: React.FC<{ onReset: () => void }> = ({ onReset }) => {
    const handleReset = () => {
        if (confirm("Change room number? This will clear your current session.")) {
            sessionStorage.removeItem('carss_room_number');
            onReset();
        }
    }

    return (
        <button onClick={handleReset} className="text-xs text-gray-400 flex items-center space-x-1 hover:text-emerald-600 transition-colors">
            <RotateCcw className="w-3 h-3" />
            <span>Change Room</span>
        </button>
    )
}
