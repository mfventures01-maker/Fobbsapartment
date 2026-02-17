/**
 * getAuthedProfile - Fetches the authenticated user's profile from Supabase
 * Uses profiles table as single source of truth (profiles.user_id → auth.user.id)
 */

import { supabase } from '@/lib/supabaseClient';
import { Profile } from './routeRules';

export class AuthError extends Error {
    constructor(public code: string, message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Gets the current session and fetches the user's profile
 * @throws AuthError with code 'NO_SESSION' if no active session
 * @throws AuthError with code 'NO_SUPABASE' if Supabase client not initialized
 * @throws AuthError with code 'PROFILE_MISSING' if no profile found
 * @throws AuthError with code 'PROFILE_INCOMPLETE' if profile is missing required fields
 * @returns The user's profile
 */
export async function getAuthedProfile(): Promise<Profile> {
    if (!supabase) {
        throw new AuthError('NO_SUPABASE', 'Database connection not available');
    }

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        throw new AuthError('SESSION_ERROR', sessionError.message);
    }

    const session = sessionData?.session;

    if (!session?.user) {
        throw new AuthError('NO_SESSION', 'No active session found. Please log in.');
    }

    const userId = session.user.id;

    // Query profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, business_id, role, department')
        .eq('user_id', userId)
        .single();

    console.log("PROFILE_DEBUG", {
        user_id: profile?.user_id,
        business_id: profile?.business_id,
        role: profile?.role,
        role_type: typeof profile?.role,
        department: profile?.department,
    });

    if (profileError) {
        if (profileError.code === 'PGRST116') {
            // No rows returned
            throw new AuthError(
                'PROFILE_MISSING',
                'No staff profile found. Please contact your administrator to set up your account.'
            );
        }
        throw new AuthError('PROFILE_ERROR', `Profile fetch failed: ${profileError.message}`);
    }

    if (!profile) {
        throw new AuthError(
            'PROFILE_MISSING',
            'No staff profile found. Please contact your administrator to set up your account.'
        );
    }

    // Validate required fields
    if (!profile.user_id || !profile.role) {
        throw new AuthError(
            'PROFILE_INCOMPLETE',
            'Your profile is incomplete. Please contact your administrator.'
        );
    }

    return {
        user_id: profile.user_id,
        business_id: profile.business_id || '',
        role: profile.role,
        department: profile.department || undefined,
    };
}
