import React, { useEffect } from 'react';
import { useShiftEngine } from '@/engine/shiftEngine';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Play, Lock } from 'lucide-react';

const ShiftBanner: React.FC = () => {
    const { authority, user } = useAuth();
    const { isShiftOpen, activeShift, loading, initShift, openShift, closeShift } = useShiftEngine();

    const isOperational = authority?.role === 'staff' || authority?.role === 'manager';

    useEffect(() => {
        if (user?.id && isOperational) {
            initShift(user.id);
        }
    }, [user, isOperational, initShift]);

    if (!isOperational) return null;

    return (
        <div className={`w-full text-white px-6 py-3 flex items-center justify-between shadow-md z-40 sticky top-0 transition-colors ${isShiftOpen ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <div className="flex flex-col">
                <div className="flex items-center space-x-2 font-black text-sm tracking-widest uppercase">
                    {isShiftOpen ? (
                        <>
                            <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-pulse shadow-[0_0_8px_rgba(134,239,172,0.8)]" />
                            <span>SHIFT OPEN</span>
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            <span>SHIFT CLOSED</span>
                        </>
                    )}
                    {loading && <RefreshCw className="w-3 h-3 animate-spin ml-2" />}
                </div>
                {isShiftOpen && activeShift?.start_time && (
                    <span className="text-xs text-white text-opacity-80 font-mono mt-0.5 ml-4">
                        Started: {new Date(activeShift.start_time).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div>
                {!isShiftOpen ? (
                    <button
                        disabled={loading}
                        onClick={() => openShift(user!.id, { opening_balance: 0 })}
                        className="bg-white text-red-700 text-xs font-bold px-4 py-2 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center"
                    >
                        <Play className="w-3 h-3 mr-1.5 fill-current" />
                        OPEN SHIFT
                    </button>
                ) : (
                    <button
                        disabled={loading}
                        onClick={() => closeShift(activeShift!.id, { variance: 0 })}
                        className="bg-white text-emerald-700 text-xs font-bold px-4 py-2 rounded-md hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center shadow-sm border border-emerald-500"
                    >
                        <Lock className="w-3 h-3 mr-1.5" />
                        CLOSE SHIFT
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShiftBanner;
