import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Database, Plus, Users, Building, ShieldCheck, Mail, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Business {
    id: string;
    name: string;
    created_at: string;
}

const SuperAdminDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);

    // Core State
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // CEO Creation Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCeo, setNewCeo] = useState({
        email: '',
        full_name: '',
        business_id: ''
    });

    const initializeDashboard = useCallback(async () => {
        console.log("[Dashboard] Mounting SuperAdminDashboard");
        try {
            setLoading(true);
            setErrorMsg(null);

            // 1. Confirm profile exists & role
            if (!profile) {
                throw new Error("Profile hydration incomplete.");
            }
            if (profile.role !== 'super_admin') {
                throw new Error("Unauthorized: Super Admin access required.");
            }

            console.log("[Dashboard] Fetching businesses");
            // 2. Fetch all businesses (Super Admin doesn't depend on profile.business_id)
            if (!supabase) throw new Error("Database client not initialized");
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                throw error;
            }

            console.log("[Dashboard] Businesses result:", data);

            // 3. Set businesses state
            setBusinesses(data || []);

        } catch (err: any) {
            console.error("[Dashboard] Initialization Error:", err);
            setErrorMsg(err.message || 'Failed to initialize Command Center');
        } finally {
            // 4. Set loading false (GUARANTEED EXIT)
            console.log("[Dashboard] Initialization complete");
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        initializeDashboard();

        // 5-second failsafe to clear infinite loading spinners
        const timeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    setErrorMsg("Initialization timed out. Please refresh.");
                    return false;
                }
                return prev;
            });
        }, 5000);

        return () => clearTimeout(timeout);
    }, [initializeDashboard]);

    const handleCreateCeo = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newCeo.business_id) {
            toast.error("Please select a business");
            return;
        }

        try {
            setIsCreating(true);
            console.log("[CEO Creation] Creating auth user and inserting profile");
            if (!supabase) throw new Error("Database client not initialized");

            const { data, error } = await supabase.functions.invoke('create-staff-user', {
                body: {
                    email: newCeo.email,
                    full_name: newCeo.full_name,
                    role: 'ceo',
                    business_id: newCeo.business_id
                }
            });

            if (error) throw new Error(error.message || 'Failed to create CEO');
            if (data?.error) throw new Error(data.error);

            console.log("[CEO Creation] Success", data);
            toast.success("CEO created successfully!");

            setNewCeo({ email: '', full_name: '', business_id: '' });
            setShowCreateModal(false);

        } catch (err: any) {
            console.error("[CEO Creation] Error:", err);
            toast.error(err.message || "Failed to create CEO account");
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-emerald-500">
                <Loader2 className="w-16 h-16 animate-spin mb-4" />
                <h2 className="text-xl font-black tracking-widest uppercase">Initializing Command Center...</h2>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-red-500 px-4 text-center">
                <AlertTriangle className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-black tracking-widest uppercase mb-2">System Error</h2>
                <p className="text-red-400 font-mono">{errorMsg}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-white font-bold transition-colors border border-red-700"
                >
                    Retry Initialization
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            {/* TOP BAR */}
            <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-xl flex justify-between items-center rounded-b-xl mx-4 mt-2">
                <div>
                    <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-500" />
                        Super Admin Command Center
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mt-1">
                        Global Platform Control
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex flex-row items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
                    >
                        <Plus className="w-4 h-4" /> Create CEO
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8 mt-4">

                {/* BUSINESS LISTING */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-500" /> Platform Businesses
                        </h3>
                        <span className="text-xs font-bold text-slate-400">{businesses.length} Total</span>
                    </div>

                    {businesses.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <Building className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600 mb-1">No businesses created yet</h3>
                            <p className="text-sm text-slate-400">Add a business to begin onboarding operations.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {businesses.map((business) => (
                                <div key={business.id} className="p-5 border border-slate-200 rounded-xl hover:border-emerald-500 transition-colors shadow-sm bg-white group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-black text-slate-800 text-lg mb-1">{business.name}</h4>
                                            <p className="text-xs text-slate-400 font-mono tracking-wider">{business.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 w-fit px-3 py-1 rounded-full">
                                        <ShieldCheck className="w-3 h-3" /> Active
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CEO CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>

                        <div className="flex justify-between items-center mb-6 mt-2">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                Provision CEO Account
                            </h2>
                        </div>

                        <form onSubmit={handleCreateCeo} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Target Business</label>
                                <select
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-700 bg-slate-50 appearance-none"
                                    value={newCeo.business_id}
                                    onChange={e => setNewCeo({ ...newCeo, business_id: e.target.value })}
                                >
                                    <option value="" disabled>Select Business...</option>
                                    {businesses.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">CEO Full Name</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sarah Connor"
                                        className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        value={newCeo.full_name}
                                        onChange={e => setNewCeo({ ...newCeo, full_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="ceo@company.com"
                                        className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        value={newCeo.email}
                                        onChange={e => setNewCeo({ ...newCeo, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md active:scale-95"
                                >
                                    {isCreating && <Loader2 size={16} className="animate-spin" />}
                                    {isCreating ? 'Provisioning...' : 'Complete Provisioning'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
