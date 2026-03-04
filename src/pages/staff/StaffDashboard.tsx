import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Clock } from 'lucide-react';

import ShiftMonitor from '@/components/ShiftMonitor';

import { getActiveShift } from '@/lib/shiftService';
import { Shift } from '@/types/db';

const StaffDashboard: React.FC = () => {
    const { user } = useAuth();
    const [shift, setShift] = React.useState<Shift | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            getActiveShift(user.id).then(data => {
                setShift(data);
                setLoading(false);
            });
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Staff Portal</h1>
                    <p className="text-gray-500">Welcome, {user?.email || 'Staff'}.</p>
                </div>

                {loading ? (
                    <div className="animate-pulse bg-gray-200 h-32 rounded-2xl" />
                ) : (
                    <div className="space-y-6">
                        {/* STEP 3 — DETERMINE UI STATE FROM SHIFT */}
                        {!shift && (
                            <ShiftMonitor /> // Falling back to existing component for start shift
                        )}

                        {shift && (
                            <div className="space-y-6">
                                {shift.status === 'open' && (
                                    <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-emerald-900">Shift Active</h3>
                                            <p className="text-emerald-700 text-sm">Terminal Unlocked for transactions.</p>
                                        </div>
                                        <div className="p-3 bg-emerald-500 text-white rounded-xl">
                                            <LayoutDashboard className="w-6 h-6" />
                                        </div>
                                    </div>
                                )}

                                {shift.status === 'pending_declaration' && (
                                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-amber-900">Closing Shift</h3>
                                            <p className="text-amber-700 text-sm">Waiting for declaration completion.</p>
                                        </div>
                                        <div className="p-3 bg-amber-500 text-white rounded-xl">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                    </div>
                                )}

                                <ShiftMonitor />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDashboard;
