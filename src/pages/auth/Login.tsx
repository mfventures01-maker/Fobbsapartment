import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Mail } from 'lucide-react';
import { getAuthedProfile, AuthError } from '@/auth/getAuthedProfile';
import { routeForProfile } from '@/auth/routeRules';

const Login: React.FC = () => {
    const { signInWithPassword } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setProfileError(null);

        const { error } = await signInWithPassword(email, password);

        if (error) {
            setLoading(false);
            toast.error(error.message);
            return;
        }

        // Fetch profile and route accordingly
        try {
            const profile = await getAuthedProfile();
            const targetRoute = routeForProfile(profile);
            toast.success('Welcome back!');
            navigate(targetRoute, { replace: true });
        } catch (err) {
            setLoading(false);
            if (err instanceof AuthError) {
                setProfileError(err.message);
                toast.error(err.message);
            } else {
                setProfileError('Failed to load profile. Please try again.');
                toast.error('Failed to load profile');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-serif font-bold text-gray-900">
                    Staff Portal
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    FOBBS Apartments Asaba
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="you@fobbs.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-900 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>

                    {profileError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-700">{profileError}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
