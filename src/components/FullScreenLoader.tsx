import React from 'react';

const FullScreenLoader: React.FC = () => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-full animate-pulse"></div>
                </div>
            </div>
            <div className="mt-8 flex flex-col items-center">
                <span className="text-sm font-bold tracking-[0.3em] uppercase opacity-50">CARSS Engine</span>
                <span className="text-xs font-medium tracking-[0.1em] text-emerald-500 mt-2">Authority Resolution Protocol Active</span>
            </div>
            <div className="absolute bottom-8 text-[10px] font-mono opacity-30 uppercase tracking-widest">
                Security Grade Layer-7 Shield
            </div>
        </div>
    );
};

export default FullScreenLoader;
