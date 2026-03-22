/**
 * Route Rules - Role-based routing configuration
 * Single source of truth for user role types and route resolution
 */

export type Role = 'admin' | 'owner' | 'ceo' | 'manager' | 'staff' | 'super_admin' | 'kitchen';

export interface Profile {
    user_id: string;
    business_id: string;
    role: Role;
    department?: string;
}

/**
 * Resolves the appropriate dashboard route based on user profile
 * @param profile - The user's profile containing role and optional department
 * @returns The dashboard route path for the user
 */
export function routeForProfile(profile: Profile): string {
    const { role, department } = profile;

    // Admin goes to root dashboard engine
    if (role === 'admin' || role === 'super_admin') {
        const path = role === 'super_admin' ? '/dashboard/super_admin' : '/dashboard';
        return path;
    }

    // Owner goes to owner dashboard
    if (role === 'owner') {
        return '/dashboard/owner';
    }

    // CEO goes to CEO dashboard
    if (role === 'ceo') {
        return '/dashboard/ceo';
    }

    // Manager goes to manager dashboard
    if (role === 'manager') {
        return '/dashboard/manager';
    }

    // Kitchen terminal access
    if (role === 'kitchen') {
        return '/dashboard/kitchen';
    }

    // Staff routing - department-based if available
    if (role === 'staff') {
        const dept = department?.toLowerCase()?.trim();

        if (dept) {
            if (dept.includes('restaurant')) {
                return '/dashboard/staff/restaurant';
            }
            if (dept.includes('bar')) {
                return '/dashboard/staff/bar';
            }
            if (dept.includes('reception')) {
                return '/dashboard/staff/reception';
            }
            if (dept.includes('housekeeping')) {
                return '/dashboard/staff/housekeeping';
            }
        }

        // Default staff dashboard
        return '/dashboard/staff';
    }

    // Fallback to generic dashboard
    return '/dashboard';
}
