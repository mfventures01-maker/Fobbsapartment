
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, ShieldCheck, UserCog } from 'lucide-react';

const DebugAuth: React.FC = () => {
    const { signInAsDemo } = useAuth();
    const navigate = useNavigate();

    const handleDemo = async (role: 'super_admin' | 'ceo' | 'manager' | 'staff', dept?: string) => {
        await signInAsDemo(role, dept);
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Forensic Auth Debug</h1>
                    <p className="text-slate-400">Restricted Access • Internal Verification System</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleDemo('super_admin')}
                        className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 hover:border-blue-500 transition-all text-left flex items-start gap-4"
                    >
                        <ShieldCheck className="text-blue-500 mt-1" />
                        <div>
                            <div className="font-bold text-lg">Super Admin</div>
                            <div className="text-xs text-slate-500">Global platform access. No business_id. Aggregated data.</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleDemo('ceo')}
                        className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 hover:border-emerald-500 transition-all text-left flex items-start gap-4"
                    >
                        <UserCog className="text-emerald-500 mt-1" />
                        <div>
                            <div className="font-bold text-lg">CEO (Business Owner)</div>
                            <div className="text-xs text-slate-500">Full control over one business. View all departments.</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleDemo('manager', 'Restaurant')}
                        className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 hover:border-amber-500 transition-all text-left flex items-start gap-4"
                    >
                        <Users className="text-amber-500 mt-1" />
                        <div>
                            <div className="font-bold text-lg">Manager (Restaurant)</div>
                            <div className="text-xs text-slate-500">Departmental scope. Can verify but not reverse everything.</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleDemo('staff')}
                        className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 hover:border-slate-500 transition-all text-left flex items-start gap-4"
                    >
                        <Users className="text-slate-500 mt-1" />
                        <div>
                            <div className="font-bold text-lg">Staff</div>
                            <div className="text-xs text-slate-500">Operational scope. Requires active shift.</div>
                        </div>
                    </button>
                </div>

                <div className="text-center mt-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        Back to Official Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DebugAuth;
