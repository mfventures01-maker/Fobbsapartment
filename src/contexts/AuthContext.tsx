
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface Profile {
  user_id: string;
  role: 'super_admin' | 'owner' | 'ceo' | 'manager' | 'staff' | 'cashier' | 'storekeeper' | 'viewer';
  business_id: string;
  department?: string;
  full_name?: string;
}

// Explicit finite states for auth hydration
export type AuthState =
  | 'initializing'      // App just mounted, checking local session
  | 'unauthenticated'   // Confirmed no session
  | 'session_loaded'    // Session found, fetching profile
  | 'authenticated'     // Session + Profile ready
  | 'error';            // Network/Hydration failed

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authState: AuthState;
  loading: boolean; // Computed from authState for backward compatibility
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signInAsDemo: (role: Profile['role'], department?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  authState: 'initializing',
  loading: true,
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
  signInAsDemo: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authState, setAuthState] = useState<AuthState>('initializing');

  // Helper: Resilient Profile Fetch with Timeout
  // Returns: { data: Profile | null, error: any | null }
  const _fetchProfilePayload = async (userId: string, retryCount = 0): Promise<{ data: Profile | null, error: any | null }> => {
    try {
      if (!supabase) return { data: null, error: 'Supabase client not initialized' };
      console.log(`[AUTH] Fetching profile for user: ${userId} (Attempt ${retryCount + 1})`);

      const TIMEOUT_MS = 5000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), TIMEOUT_MS)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Race against timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) {
        console.error("[AUTH] Profile fetch error:", error.message);
        // Retry logic for network errors
        if (retryCount < 2 && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout'))) {
          await new Promise(res => setTimeout(res, 1000));
          return _fetchProfilePayload(userId, retryCount + 1);
        }
        // If it's a "PGRST116" (JSON object not found) it means strictly no row, which is valid "Not Configured" state, not a network error.
        if (error.code === 'PGRST116') {
          return { data: null, error: null }; // No profile found, but operation successful
        }

        return { data: null, error: error };
      }

      if (data) {
        console.log(`[AUTH] Profile loaded for ${data.full_name || userId} (${data.role})`);
        return { data: data as Profile, error: null };
      }
    } catch (err: any) {
      console.error("[AUTH] Profile fetch exception:", err.message);
      if (retryCount < 2) {
        await new Promise(res => setTimeout(res, 1000));
        return _fetchProfilePayload(userId, retryCount + 1);
      }
      return { data: null, error: err };
    }
    return { data: null, error: null };
  };

  const initAuth = async () => {
    if (!supabase) {
      setAuthState('error');
      return;
    }

    try {
      // 1. Get Session
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn("[AUTH] Session error on init:", error.message);
        // Handle bad tokens gracefully
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut().catch(() => { });
          setAuthState('unauthenticated');
        } else {
          setAuthState('error'); // Genuine error
        }
        return;
      }

      // 2. Hydrate State
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        setAuthState('session_loaded');

        const { data: profileData, error: profileError } = await _fetchProfilePayload(initialSession.user.id);

        if (profileError) {
          console.error("[AUTH] Critical: Profile fetch failed.", profileError);
          setAuthState('error');
        } else {
          // profileData might be null if not found (PGRST116), which is valid "Authenticated but not configured"
          if (profileData) setProfile(profileData);
          setAuthState('authenticated');
        }
      } else {
        console.log("[AUTH] No active session on init.");
        setAuthState('unauthenticated');
      }
    } catch (err) {
      console.error("Auth Init Critical Failure", err);
      setAuthState('error');
    }
  };

  useEffect(() => {
    // Mount phase
    console.log("[AUTH] State Machine Starting...");
    initAuth();

    if (!supabase) return;

    // Subscription phase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[AUTH] Event Fired: ${event}`);

      switch (event) {
        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthState('unauthenticated');
          // Clear any local state if needed
          break;

        case 'SIGNED_IN':
          // New login
          if (newSession?.user) {
            setAuthState('session_loaded');
            setSession(newSession);
            setUser(newSession.user);
            const { data: p, error: err } = await _fetchProfilePayload(newSession.user.id);
            if (err) {
              setAuthState('error');
            } else {
              setProfile(p);
              setAuthState('authenticated');
            }
          }
          break;

        case 'TOKEN_REFRESHED':
          // Just update session, no need to refetch profile unless missing
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            // Only refetch if we somehow lost the profile or it's missing (edge case)
            // But generally, don't block UI on token refresh
            if (authState === 'authenticated' && !profile && newSession.user) {
              _fetchProfilePayload(newSession.user.id).then(({ data }) => {
                if (data) setProfile(data);
              });
            }
          }
          break;

        case 'INITIAL_SESSION':
          // Handled by initAuth
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not initialized' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInAsDemo = async (role: Profile['role'], department?: string) => {
    setAuthState('session_loaded');

    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    const mockId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
    const mockUser = {
      id: mockId,
      email: `demo.${role}@fobbs.com`,
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    } as User;

    const mockSession = {
      access_token: 'demo-token',
      token_type: 'bearer',
      user: mockUser,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session;

    const mockProfile: Profile = {
      user_id: mockId,
      role: role,
      business_id: '7102604d-e99d-48ef-968b-59d4c7943d74',
      department: department,
      full_name: `Demo ${role.toUpperCase()}`,
    };

    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    setAuthState('authenticated');
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      // State update handled by listener
    }
  };

  // derived loading state for backward compatibility
  const loading = authState === 'initializing' || authState === 'session_loaded';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      authState,
      loading,
      signOut,
      signInWithPassword,
      signInAsDemo
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
