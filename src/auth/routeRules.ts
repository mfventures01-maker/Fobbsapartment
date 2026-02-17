/**
 * Route Rules - Role-based routing configuration
 * Single source of truth for user role types and route resolution
 */

export type Role = 'owner' | 'ceo' | 'manager' | 'staff';

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

    // Owner goes to owner dashboard
    if (role === 'owner') {
        return '/dashboard/owner';
    }

    // CEO goes to CEO dashboard
    if (role === 'ceo') {
        return '/ceo?token=carss-secure-ceo';
    }

    // Manager goes to manager dashboard
    if (role === 'manager') {
        return '/dashboard/manager';
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
