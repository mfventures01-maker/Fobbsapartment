import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { LayoutDashboard, Users, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const OpenShiftScreen: React.FC = () => {
    const { authority } = useAuth();
    const { startShift } = useShiftState();
    const [loading, setLoading] = useState(false);

    const handleOpenShift = async () => {
        setLoading(true);
        const { error } = await startShift();
        if (error) {
            toast.error(error.message || 'Failed to open shift');
            setLoading(false);
        } else {
            toast.success('Shift started successfully');
        }
    };

    if (authority.status !== 'authorized') return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -transe-y-1/2 translate-x-1/2 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>

                <div className="relative text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <Clock className="w-10 h-10 text-emerald-700" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-emerald-950 font-serif mb-2 text-center">No Active Shift</h1>
                        <p className="text-gray-500 text-sm px-6 text-center">You must open a shift to access the terminal and process transactions.</p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100 text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Department</p>
                                <p className="text-sm font-semibold text-gray-800">{authority.departmentName || 'General Staff'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Staff Role</p>
                                <p className="text-sm font-semibold text-gray-800 capitalize">{authority.role}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleOpenShift}
                        disabled={loading}
                        className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 active:scale-95 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50"
                    >
                        {loading ? 'Initializing...' : 'Open New Shift'}
                        <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] pt-4">CARSS HOSPITALITY ENGINE v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default OpenShiftScreen;
