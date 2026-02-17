import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const StaffLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signInAsDemo } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

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
                toast.success('Welcome back!');

                // Navigate to root, AuthGate will pick up the session and redirect based on role
                navigate('/', { replace: true });
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

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-400">
                                Or Use Demo Access
                            </span>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    await signInAsDemo('staff', 'restaurant');
                                    // Navigation is handled inside signInAsDemo or via auth state change
                                } catch (err) {
                                    toast.error("Demo login failed");
                                    console.error(err);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            {loading ? 'Loading...' : 'Demo Staff Access'}
                        </button>
                    </div>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Fobbs Apartments Internal System
                </div>

                {/* Debug Section Removed */}
            </div>
        </div>
    );
};

export default StaffLogin;
