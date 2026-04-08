import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

const LocationRouter: React.FC = () => {
    const { branch, department, locationId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const src = searchParams.get('src') || 'qr';
        const campaign = searchParams.get('campaign') || '';

        if (locationId) {
            sessionStorage.setItem('qr_location_id', locationId);
            sessionStorage.setItem('qr_department', department || '');
            sessionStorage.setItem('qr_branch', branch || '');
            sessionStorage.setItem('qr_src', src);
            sessionStorage.setItem('qr_campaign', campaign);
        }

        // Logic to redirect
        if (department === 'bar' || department === 'lounge') {
            navigate(`/bar?loc=${locationId}`, { replace: true });
        } else if (department === 'restaurant') {
            navigate(`/restaurant?loc=${locationId}`, { replace: true });
        } else {
            navigate(`/?loc=${locationId}`, { replace: true });
        }
    }, [branch, department, locationId, navigate, searchParams]);

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-emerald-500 animate-pulse font-mono tracking-widest text-sm">
                INITIALIZING TERMINAL [{locationId}]...
            </div>
        </div>
    );
};

export default LocationRouter;
