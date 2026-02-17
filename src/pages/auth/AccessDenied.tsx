import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccessDenied: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-red-600">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have the required permissions to access this page.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
