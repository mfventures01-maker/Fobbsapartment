import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { routeForProfile, Profile } from '@/auth/routeRules';

const StaffLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setDebugInfo(null);

        if (!supabase) {
            toast.error('System offline: DB connection missing');
            setLoading(false);
            return;
        }

        try {
            console.log("Attempting login for:", email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Auth Error:", error);
                throw error;
            }

            if (data.user) {
                console.log("Auth success. User ID:", data.user.id);

                // Fetch profile to check role
                // Querying by user_id as per requirements
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                console.log("Profile Fetch Result:", { profile, profileError });

                if (profileError) {
                    console.error("Profile Fetch Error:", profileError);
                    toast.error(`Database error: ${profileError.message}`);
                    setDebugInfo({ userId: data.user.id, error: profileError.message });
                    await supabase.auth.signOut();
                    return;
                }

                if (!profile) {
                    // Try fallback to 'id' just in case schema migration hasn't run yet, 
                    // though requirements say we must use user_id. 
                    // We will report the specific error requested.
                    console.warn("No profile found with user_id.");
                    const msg = "No staff profile found. Admin must link this user in profiles.";
                    toast.error(msg);
                    setDebugInfo({ userId: data.user.id, error: "No profile row found" });
                    await supabase.auth.signOut();
                    return;
                }

                setDebugInfo({
                    userId: data.user.id,
                    role: profile.role,
                    department: profile.department
                });

                const allowedRoles = ['owner', 'ceo', 'manager', 'staff'];
                if (allowedRoles.includes(profile.role)) {
                    toast.success(`Welcome back, ${profile.full_name || 'Staff'}!`);

                    // Use routeForProfile for consistent routing
                    const profileData: Profile = {
                        user_id: profile.user_id,
                        business_id: profile.business_id || '',
                        role: profile.role,
                        department: profile.department || undefined,
                    };
                    const targetRoute = routeForProfile(profileData);
                    navigate(targetRoute, { replace: true });

                } else {
                    toast.error('Unauthorized: Staff access only.');
                    await supabase.auth.signOut();
                }
            }
        } catch (error: any) {
            console.error("Login System Error:", error);
            toast.error(error.message || 'Error executing login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl card-shine border border-gray-100">
                <div className="text-center mb-8">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-700">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold font-serif text-emerald-950">Staff Portal</h2>
                    <p className="text-gray-500 mt-2">Authorized personnel only.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                                placeholder="staff@fobbs.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-900 text-white py-3 rounded-xl font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 shadow-lg"
                    >
                        {loading ? 'Verifying...' : 'Access Portal'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Fobbs Apartments Internal System
                </div>

                {/* Debug Section */}
                {debugInfo && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs font-mono text-gray-600 border border-gray-200 text-left">
                        <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold border-b pb-1">
                            <Info className="w-3 h-3" /> Login Diagnostics
                        </div>
                        <div>User ID: {debugInfo.userId}</div>
                        {debugInfo.role && <div>Role: {debugInfo.role}</div>}
                        {debugInfo.department && <div>Dept: {debugInfo.department}</div>}
                        {debugInfo.error && <div className="text-red-500 mt-1">Error: {debugInfo.error}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffLogin;
