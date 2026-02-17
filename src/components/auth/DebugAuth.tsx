import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { Loader2, ShieldCheck, ShieldAlert, WifiOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DebugAuth: React.FC = () => {
    const { role, businessId, loading: roleLoading, refreshRole } = useRole();
    const [user, setUser] = useState<any>(null);
    const [memberships, setMemberships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const navigate = useNavigate();

    const fetchDebugInfo = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: mems, error } = await supabase
                    .from('business_memberships')
                    .select('*')
                    .eq('user_id', user.id);

                if (error) console.error("Membership Fetch Error:", error);
                setMemberships(mems || []);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebugInfo();
    }, []);

    const handleForceRefresh = async () => {
        await refreshRole();
        await fetchDebugInfo();
    };

    const attemptRedirect = () => {
        if (role === 'super_admin') navigate('/super-admin');
        else if (role === 'ceo') navigate('/ceo');
        else if (role === 'manager') navigate('/manager');
        else if (['staff', 'cashier', 'storekeeper'].includes(role || '')) navigate('/staff');
        else alert('No valid role mapped for redirect');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 font-mono">
            <h1 className="text-3xl font-bold mb-6 text-red-500 border-b border-red-900 pb-2">
                AUTH STRESS TEST & DIAGNOSTICS
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. SUPABASE AUTH STATE */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                        <ShieldCheck /> Supabase Identity
                    </h2>
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-2 text-sm">
                            <p><span className="text-slate-500">User ID:</span> {user?.id || 'NULL (Not Logged In)'}</p>
                            <p><span className="text-slate-500">Email:</span> {user?.email || 'NULL'}</p>
                            <p><span className="text-slate-500">Last Sign In:</span> {user?.last_sign_in_at || 'Never'}</p>
                            <p><span className="text-slate-500">Role (JWT):</span> {user?.role}</p>
                        </div>
                    )}
                </div>

                {/* 2. ROLE CONTEXT STATE */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                        <ShieldAlert /> Role Context (App Authority)
                    </h2>
                    {roleLoading ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-2 text-sm">
                            <p><span className="text-slate-500">Role:</span> <span className="font-bold text-yellow-400">{role || 'NULL'}</span></p>
                            <p><span className="text-slate-500">Business ID:</span> {businessId || 'NULL'}</p>
                            <div className="mt-4">
                                <button
                                    onClick={handleForceRefresh}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-bold uppercase flex items-center gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" /> Force Refresh Context
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. RAW DB MEMBERSHIPS */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 col-span-1 md:col-span-2">
                    <h2 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
                        <DatabaseIcon /> Raw 'business_memberships' Table
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                        This is the source of truth. If specific rows are missing here, the user has NO authority.
                    </p>
                    {memberships.length === 0 ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded">
                            NO MEMBERSHIP RECORDS FOUND FOR THIS USER ID.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 border-b border-slate-700">
                                        <th className="p-2">Role</th>
                                        <th className="p-2">Business ID</th>
                                        <th className="p-2">User ID</th>
                                        <th className="p-2">ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {memberships.map(m => (
                                        <tr key={m.id} className="border-b border-slate-700 font-mono">
                                            <td className="p-2 text-emerald-400 font-bold">{m.role}</td>
                                            <td className="p-2">{m.business_id}</td>
                                            <td className="p-2">{m.user_id}</td>
                                            <td className="p-2 text-slate-500">{m.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 4. ACTION PANEL */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 col-span-1 md:col-span-2">
                    <h2 className="text-xl font-bold mb-4 text-white">Diagnostics & Actions</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={attemptRedirect}
                            className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded font-bold uppercase text-sm"
                            disabled={!role}
                        >
                            Test Redirect Logic Now
                        </button>
                        <button
                            onClick={() => { supabase.auth.signOut(); navigate('/login'); }}
                            className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded font-bold uppercase text-sm"
                        >
                            Sign Out & Reset
                        </button>
                    </div>
                    <div className="mt-4 p-4 bg-black rounded text-xs text-green-400 font-mono">
                        Last Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></svg>
);

export default DebugAuth;
