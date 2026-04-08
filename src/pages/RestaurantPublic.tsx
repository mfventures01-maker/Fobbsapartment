import React, { useEffect, useState, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
const RestaurantMenu = React.lazy(() => import('@/components/RestaurantMenu'));

export default function RestaurantPublic() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [location, setLocation] = useState<string | null>(null);

    useEffect(() => {
        let locId = searchParams.get('loc');
        if (locId) {
            setLocation(locId);
            sessionStorage.setItem('qr_location_id', locId);
        } else {
            const stored = sessionStorage.getItem('qr_location_id');
            if (stored) setLocation(stored);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header aligned seamlessly with Bar interface */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0 mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="p-2 bg-white shadow-sm hover:bg-gray-100 rounded-full shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 font-serif">Fobbs Restaurant</h1>
                            {location && (
                                <div className="mt-2 inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                                    📍 You are ordering from: {location.toLowerCase().startsWith('r') || location.toLowerCase().includes('room') ? `Room ${location}` : `Table ${location}`}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TOGGLE SWITCH - NAVIGATION */}
                    <div className="flex bg-gray-200 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => navigate(`/bar${location ? `?loc=${location}` : ''}`)}
                            className="px-5 py-2 rounded-lg font-bold text-sm transition-all text-gray-500 hover:text-gray-700"
                        >
                            🍸 Bar & Drinks
                        </button>
                        <button
                            className="px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm bg-white text-emerald-700 cursor-default"
                        >
                            🍽️ Restaurant Food
                        </button>
                    </div>
                </div>

                <Suspense fallback={
                    <div className="flex justify-center items-center p-12 text-emerald-600 animate-pulse">
                        <Loader2 className="w-8 h-8 animate-spin mr-3" />
                        <span className="font-bold">Loading Menu Interface...</span>
                    </div>
                }>
                    <RestaurantMenu />
                </Suspense>

            </div>
        </div>
    );
}
