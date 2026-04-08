import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function AnalyticsView() {
    const [searchParams] = useSearchParams();
    const querySecret = searchParams.get('secret');

    // Make sure VITE_ANALYTICS_SECRET is in your .env
    const ENV_SECRET = import.meta.env.VITE_ANALYTICS_SECRET || 'fobbs123';

    const [authSecret, setAuthSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Dates
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [locationId, setLocationId] = useState('all');

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (querySecret === ENV_SECRET) {
            setAuthSecret(querySecret || '');
            setIsAuthenticated(true);
        } else if (authSecret === ENV_SECRET) {
            setIsAuthenticated(true);
        }
    }, [querySecret, authSecret, ENV_SECRET]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            let ordersQuery = supabase
                .from('order_submission_events')
                .select('*')
                .gte('submitted_at', start.toISOString())
                .lte('submitted_at', end.toISOString());
            if (locationId !== 'all') {
                ordersQuery = ordersQuery.eq('location_id', locationId);
            }
            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            let scansQuery = supabase
                .from('qr_scan_events')
                .select('*')
                .gte('scanned_at', start.toISOString())
                .lte('scanned_at', end.toISOString());
            if (locationId !== 'all') {
                scansQuery = scansQuery.eq('location_id', locationId);
            }
            const { data: scans, error: scansError } = await scansQuery;
            if (scansError) throw scansError;

            const scanCountByLocation = (scans || []).reduce((acc: any, s: any) => {
                acc[s.location_id] = (acc[s.location_id] || 0) + 1;
                return acc;
            }, {});

            const scansByLocation = Object.entries(scanCountByLocation).map(([loc, count]) => ({ location_id: loc, count }));

            const totalOrders = orders?.length || 0;
            const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) || 0;
            const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

            setData({
                summary: {
                    totalScans: scans?.length || 0,
                    totalOrders,
                    totalRevenue,
                    avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
                },
                orders: orders || [],
                scansByLocation
            });
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load analytics: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, startDate, endDate, locationId]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <form
                    onSubmit={(e) => { e.preventDefault(); if (authSecret === ENV_SECRET) setIsAuthenticated(true); else toast.error('Wrong Secret'); }}
                    className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-sm w-full"
                >
                    <h1 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4 border-gray-100">Analytics Auth</h1>
                    <div className="space-y-4">
                        <input
                            type="password"
                            placeholder="Enter Analytics Secret"
                            value={authSecret}
                            onChange={(e) => setAuthSecret(e.target.value)}
                            className="bg-gray-50 border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button type="submit" className="bg-emerald-600 text-white font-bold w-full p-3 rounded-lg hover:bg-emerald-700 transition">Enter</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto bg-gray-50 min-h-screen print:bg-white text-sm">
            <style>
                {`
                @media print {
                    .print-hidden { display: none !important; }
                    body { background: white !important; }
                    .print-table { width: 100%; border-collapse: collapse; }
                    .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                }
                `}
            </style>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 print-hidden">
                <h1 className="text-3xl font-bold text-gray-900 font-serif">CARSS Statement of Account</h1>
                <button onClick={() => window.print()} className="mt-4 sm:mt-0 bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-bold shadow transition flex items-center gap-2">
                    🖨️ Print Report
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100 print-hidden">
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-2 rounded bg-gray-50 outline-none" />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border p-2 rounded bg-gray-50 outline-none" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Location Filter</label>
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full border p-2 rounded bg-gray-50 outline-none">
                        <option value="all">All Available Locations</option>
                        {Array.from({ length: 15 }, (_, i) => `T${i + 1}`).map(t => <option key={t} value={t}>Table {t}</option>)}
                        {Array.from({ length: 10 }, (_, i) => `R10${i + 1}`).map(r => <option key={r} value={r}>Room {r}</option>)}
                    </select>
                </div>
            </div>

            {loading && <div className="text-center font-bold text-emerald-600 animate-pulse py-10 print-hidden">📡 Fetching events from layer...</div>}

            {!loading && data && (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Total Scans</div>
                            <div className="text-3xl font-black text-gray-900">{data.summary.totalScans}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Total Orders Placed</div>
                            <div className="text-3xl font-black text-emerald-600">{data.summary.totalOrders}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Est. Gross Revenue</div>
                            <div className="text-3xl font-black text-gray-900">₦{data.summary.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Avg. Order Value</div>
                            <div className="text-3xl font-black text-emerald-600">₦{data.summary.avgOrderValue.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Orders Ledger */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">Order Submissions Ledger</h2>
                            <p className="text-xs text-gray-500 mt-1">Timeline of all orders sent out via Messaging Channels</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="print-table w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4">Timestamp (Local)</th>
                                        <th className="p-4">Location</th>
                                        <th className="p-4">Platform</th>
                                        <th className="p-4">Items Count</th>
                                        <th className="p-4 text-right">Value (₦)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.orders.map((o: any) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-medium text-gray-600">{new Date(o.submitted_at).toLocaleString()}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">{o.location_id}</span></td>
                                            <td className="p-4 capitalize">{o.platform}</td>
                                            <td className="p-4">{o.item_count}</td>
                                            <td className="p-4 text-right font-black text-gray-900">{Number(o.total_amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {data.orders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No telemetry recorded for this timeframe.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scans Tracker */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">Physical Location Heatmap</h2>
                            <p className="text-xs text-gray-500 mt-1">Which QR codes are actively being engaged.</p>
                        </div>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4 w-1/2">Location Key</th>
                                    <th className="p-4 w-1/2">Total Sweeps</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.scansByLocation.map((loc: any) => (
                                    <tr key={loc.location_id}>
                                        <td className="p-4 font-bold text-emerald-700">{loc.location_id}</td>
                                        <td className="p-4 text-gray-600">{loc.count} interactions</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
