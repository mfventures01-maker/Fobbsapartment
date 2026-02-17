import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-orange-600">Unauthorized</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have a valid role/membership associated with your account. Please contact support.
                </p>
                <Link
                    to="/login"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                    Go to Login
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
