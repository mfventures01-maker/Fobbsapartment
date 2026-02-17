import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, UserX, Shield, Mail, Users, Filter, Loader2 } from 'lucide-react';

interface StaffMember {
    user_id: string;
    full_name: string;
    role: string;
    department: string;
    email: string;
    status: string;
    last_activity_at: string;
}

const CeoStaffAdmin: React.FC = () => {
    const { profile } = useAuth();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [newUser, setNewUser] = useState({
        email: '',
        full_name: '',
        role: 'staff',
        department: '',
    });

    useEffect(() => {
        if (profile?.business_id) {
            fetchStaff();
        }
    }, [profile?.business_id]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('business_id', profile!.business_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaff(data as StaffMember[]);
        } catch (err) {
            console.error('Error fetching staff:', err);
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const { data, error } = await supabase.functions.invoke('create-staff-user', {
                body: {
                    ...newUser,
                    business_id: profile!.business_id,
                    branch_id: profile!.business_id // defaulting to business_id as branch assumption for simplified single-branch/HQ setup, or fetch actual branch
                }
            });

            if (error) throw new Error(error.message || 'Invitation failed');
            if (data?.error) throw new Error(data.error);

            toast.success('Staff invitation sent successfully!');
            setShowModal(false);
            setNewUser({ email: '', full_name: '', role: 'staff', department: '' });
            fetchStaff();

        } catch (err: any) {
            console.error('Invite error:', err);
            toast.error(err.message || 'Failed to invite staff');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeactivate = async (userId: string) => {
        if (!confirm('Are you sure you want to deactivate this user? They will lose access immediately.')) return;

        try {
            const { error } = await supabase.functions.invoke('deactivate-user', {
                body: { user_id: userId }
            });

            if (error) throw error;

            toast.success('User deactivated');
            fetchStaff(); // Refresh list
        } catch (err) {
            console.error('Deactivate error:', err);
            toast.error('Failed to deactivate user');
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase.functions.invoke('update-user-role', {
                body: { user_id: userId, role: newRole }
            });
            if (error) throw error;
            toast.success('Role updated');
            fetchStaff();
        } catch (err) {
            console.error('Role update error:', err);
            toast.error('Failed to update role');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                    <p className="text-gray-500">Manage your team, roles, and access permissions.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <Plus size={20} />
                    <span>Invite Staff</span>
                </button>
            </div>

            {/* Stats Cards (Optional Polish) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Staff</p>
                        <p className="text-xl font-bold">{staff.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-full">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Managers</p>
                        <p className="text-xl font-bold">{staff.filter(s => s.role === 'manager' && s.status === 'active').length}</p>
                    </div>
                </div>
            </div>

            {/* Staff List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Team Directory</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Filter size={14} /> Showing all
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500 flex justify-center">
                        <Loader2 className="animate-spin mr-2" /> Loading staff...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Name / Email</th>
                                    <th className="px-6 py-3 font-medium">Role</th>
                                    <th className="px-6 py-3 font-medium">Department</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {staff.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{user.full_name}</div>
                                            <div className="text-gray-500 text-xs flex items-center gap-1">
                                                <Mail size={12} /> {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleUpdate(user.user_id, e.target.value)}
                                                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                                                disabled={user.role === 'owner'}
                                            >
                                                <option value="manager">Manager</option>
                                                <option value="staff">Staff</option>
                                                <option value="viewer">Viewer</option>
                                                {user.role === 'owner' && <option value="owner">Owner</option>}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{user.department || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeactivate(user.user_id)}
                                                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded text-xs font-medium"
                                                title="Deactivate User"
                                                disabled={user.status === 'suspended'}
                                            >
                                                {user.status === 'suspended' ? 'Suspended' : 'Deactivate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {staff.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No staff members found. Invite your first team member!
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Invite New Team Member</h2>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-black focus:border-black"
                                    value={newUser.full_name}
                                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-black focus:border-black"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-black focus:border-black"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-black focus:border-black"
                                        value={newUser.department}
                                        onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Reception">Reception</option>
                                        <option value="Restaurant">Restaurant</option>
                                        <option value="Housekeeping">Housekeeping</option>
                                        <option value="Bar">Bar</option>
                                        <option value="Management">Management</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 size={16} className="animate-spin" />}
                                    {isCreating ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CeoStaffAdmin;
