import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { RefreshCw, Play, Lock, Clock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ShiftBanner: React.FC = () => {
    const { authority } = useAuth();
    const { shiftState, startShift, endShift } = useShiftState();

    const isOperational = authority?.status === 'authorized' && (authority.role === 'staff' || authority.role === 'manager');

    if (!isOperational) return null;

    const handleStartShift = async () => {
        const { error } = await startShift();
        if (error) {
            toast.error(error.message || 'Failed to start shift');
        } else {
            toast.success('Shift started');
        }
    };

    const handleEndShift = async () => {
        if (window.confirm('Are you sure you want to end your shift and prepare for declaration?')) {
            const { error } = await endShift();
            if (error) {
                toast.error(error.message || 'Failed to end shift');
            } else {
                toast.success('Shift ended. Please submit your declaration.');
            }
        }
    };

    const isLoading = shiftState.status === 'loading';
    const hasShift = 'shift' in shiftState;
    const isActive = shiftState.status === 'active';
    const isAwaiting = shiftState.status === 'awaiting_opening' || shiftState.status === 'awaiting_approval';
    const isPending = shiftState.status === 'pending_declaration';

    const bgColor = isActive ? 'bg-emerald-600' :
        (isAwaiting || isPending) ? 'bg-amber-600' :
            'bg-slate-700';

    return (
        <div className={`w-full text-white px-6 py-2.5 flex items-center justify-between shadow-sm z-40 sticky top-0 transition-all duration-300 ${bgColor}`}>
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2 font-black text-[10px] tracking-widest uppercase">
                        {shiftState.status === 'active' ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                <span>Shift Active</span>
                            </>
                        ) : shiftState.status === 'awaiting_opening' ? (
                            <>
                                <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                <span>Waiting for manager approval</span>
                            </>
                        ) : shiftState.status === 'pending_declaration' ? (
                            <>
                                <Lock className="w-3.5 h-3.5 text-amber-200" />
                                <span>Shift Ended — Enter Declaration</span>
                            </>
                        ) : shiftState.status === 'awaiting_approval' ? (
                            <>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                                <span>Waiting for Manager Review</span>
                            </>
                        ) : (
                            <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>No Active Shift</span>
                            </>
                        )}
                        {isLoading && <RefreshCw className="w-3 h-3 animate-spin ml-2" />}
                    </div>
                    {hasShift && shiftState.shift.start_time && (
                        <span className="text-[10px] text-white text-opacity-90 font-mono mt-0.5">
                            Started: {new Date(shiftState.shift.start_time).toLocaleTimeString()}
                        </span>
                    )}
                </div>

                <div className="h-4 w-px bg-white/20 hidden sm:block" />

                <div className="hidden sm:flex flex-col">
                    <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter leading-none">Terminal</span>
                    <span className="text-xs font-bold leading-none">{authority.departmentName || 'General Operations'}</span>
                </div>
            </div>

            <div>
                {!isActive ? (
                    <button
                        disabled={isLoading || isAwaiting || isPending}
                        onClick={handleStartShift}
                        className="bg-white text-amber-700 text-[10px] font-black tracking-wider px-4 py-1.5 rounded-lg hover:bg-amber-50 active:scale-95 disabled:opacity-50 transition-all flex items-center shadow-lg"
                    >
                        <Play className="w-3 h-3 mr-1.5 fill-current" />
                        START SHIFT
                    </button>
                ) : (
                    <button
                        disabled={isLoading}
                        onClick={handleEndShift}
                        className="bg-emerald-800 text-white text-[10px] font-black tracking-wider px-4 py-1.5 rounded-lg hover:bg-emerald-900 active:scale-95 disabled:opacity-50 transition-all flex items-center shadow-lg border border-emerald-400/30"
                    >
                        <Lock className="w-3 h-3 mr-1.5" />
                        END SHIFT
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShiftBanner;
