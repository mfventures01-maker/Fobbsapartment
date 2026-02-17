import React from 'react';
import CeoDashboard from './CeoDashboard';

const CeoOverview: React.FC = () => {
    // We are delegating the overview logic to the comprehensive CeoDashboard component
    // which contains the "Financial Control Tower" features.
    return (
        <div className="animate-in fade-in duration-500">
            <CeoDashboard />
        </div>
    );
};

export default CeoOverview;
