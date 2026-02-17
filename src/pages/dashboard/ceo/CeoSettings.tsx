import React from 'react';

const CeoSettings: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
            <p className="text-gray-500 mt-2 max-w-sm">Global configurations for the organization.</p>
            <div className="mt-6 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">Coming in Phase 2</div>
        </div>
    );
};

export default CeoSettings;
