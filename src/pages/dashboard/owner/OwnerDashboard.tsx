import React from 'react';
import CeoDashboard from '../ceo/CeoDashboard';

const OwnerDashboard: React.FC = () => {
    return (
        <div className="bg-slate-50 min-h-screen">
            {/* 
                Reusing the CEO "Financial Control Tower" for the Owner/Super Admin 
                to ensure a single source of truth for financial data.
            */}
            <CeoDashboard />
        </div>
    );
};

export default OwnerDashboard;
