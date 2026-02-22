import React from 'react';
import SuperAdminDashboard from '../super_admin/SuperAdminDashboard';

const OwnerDashboard: React.FC = () => {
    return (
        <div className="bg-slate-50 min-h-screen">
            <SuperAdminDashboard />
        </div>
    );
};

export default OwnerDashboard;
