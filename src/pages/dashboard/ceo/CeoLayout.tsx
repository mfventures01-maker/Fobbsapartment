import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BranchSwitcher from '@/components/BranchSwitcher';
import { LayoutDashboard, Building2, Activity, Users, Settings, LogOut } from 'lucide-react';
import { BranchProvider } from '@/contexts/BranchContext';
import { supabase } from '@/lib/supabaseClient';

const CeoLayoutContent: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { path: '/ceo', label: 'Overview', icon: LayoutDashboard, end: true },
        { path: '/ceo/branches', label: 'Branches', icon: Building2 },
        { path: '/ceo/audit', label: 'Audit Feed', icon: Activity },
        { path: '/ceo/staff', label: 'Staff', icon: Users },
        { path: '/ceo/settings', label: 'Settings', icon: Settings },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
                <div className="px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CEO Command Center</h1>
                        </div>

                        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                        {/* Navigation Tabs - Desktop */}
                        <nav className="hidden md:flex gap-1">
                            {navItems.map((item) => {
                                const isActive = item.end
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={`
                      flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isActive
                                                ? 'text-gray-900 bg-gray-100'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                            }
                    `}
                                    >
                                        <item.icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <BranchSwitcher />
                        <button
                            onClick={handleLogout}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100 flex items-center gap-2"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline uppercase">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-0 sm:p-6 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};

const CeoLayout: React.FC = () => {
    return (
        <BranchProvider>
            <CeoLayoutContent />
        </BranchProvider>
    );
};

export default CeoLayout;
