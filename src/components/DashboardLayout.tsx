import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Scale, Send, LogOut, Menu, X, Users } from 'lucide-react';

const DashboardLayout: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // Determine home route
    const homepath = profile ? (
        ['owner', 'ceo'].includes(profile.role) ? '/dashboard/owner' :
            profile.role === 'manager' ? '/dashboard/manager' :
                profile.role === 'staff' && profile.department ? `/dashboard/staff/${profile.department}` :
                    '/dashboard/staff'
    ) : '/dashboard';

    const navItems = [
        { name: 'Overview', path: homepath, icon: LayoutDashboard },
    ];

    // Add extra items for admins
    if (['owner', 'ceo', 'manager'].includes(profile?.role || '')) {
        navItems.push({ name: 'Payments', path: '/dashboard/payments', icon: CreditCard });
        navItems.push({ name: 'Disputes', path: '/dashboard/disputes', icon: Scale });
        navItems.push({ name: 'Admin Outbox', path: '/dashboard/outbox', icon: Send });

        // Staff Admin Link - adjust based on base path if needed, but absolute path is safest
        // In App.tsx, staff-admin is under /dashboard/owner/staff-admin but let's check where it is relative
        // Actually, it's safer to just put it at a known location. 
        // With the current App.tsx, it's nested under /dashboard/owner. 
        // Let's assume we want to link validation.
        const adminPath = profile?.role === 'manager' ? '/dashboard/manager/staff-admin' : '/dashboard/owner/staff-admin';
        // Note: You need to ensure the route exists for manager too in App.tsx
        navItems.push({ name: 'Staff Creator', path: adminPath, icon: Users });
    } else {
        // Staff items (if any specific ones needed)
        // navItems.push({ name: 'My Tasks', path: '/dashboard/tasks', icon: List });
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-emerald-900 font-serif font-bold text-xl">FOBBS Admin</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`${location.pathname === item.path
                                            ? 'border-emerald-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                    >
                                        <item.icon className="w-4 h-4 mr-2" />
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-medium text-gray-700 uppercase">{profile?.role}</span>
                                <span className="text-xs text-gray-500">
                                    {profile?.business_id ? `Business: ${profile.business_id.slice(0, 8)}...` : 'No Business'}
                                </span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                            >
                                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`${location.pathname === item.path
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                                        } block pl-3 pr-4 py-2 border-l-4 text-base font-medium flex items-center`}
                                >
                                    <item.icon className="w-4 h-4 mr-2" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                        <div className="pt-4 pb-4 border-t border-gray-200">
                            <div className="flex items-center px-4">
                                <div className="ml-3">
                                    <div className="text-base font-medium text-gray-800 uppercase">{profile?.role}</div>
                                    <div className="text-sm font-medium text-gray-500">{profile?.user_id}</div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="ml-auto bg-white flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                                >
                                    <LogOut className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
