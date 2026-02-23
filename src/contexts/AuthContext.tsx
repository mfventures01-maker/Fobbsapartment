
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

import { Profile } from '@/types/db';

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
  const hasInitialized = useRef(false);

  // Task 4: Harden fetchProfile
  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    console.log("[AUTH] Fetching profile for user:", userId);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      console.log("[AUTH] No session available. Aborting profile fetch.");
      return;
    }

    const [profileRes, membershipRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("business_memberships").select("*").eq("user_id", userId).single()
    ]);

    if (profileRes.error && profileRes.error.code !== 'PGRST116') {
      console.error("[AUTH] Profile fetch failed:", profileRes.error);
      setAuthState('error');
      return;
    }

    // Merge identity and role/business_id
    const mergedData = {
      ...(profileRes.data || { user_id: userId, full_name: 'Unknown User' }),
      role: membershipRes.data?.role || profileRes.data?.role || 'staff',
      business_id: membershipRes.data?.business_id || profileRes.data?.business_id || null,
      department: membershipRes.data?.department || profileRes.data?.department || null
    };

    if (mergedData) {
      console.log("[AUTH] Profile loaded for", mergedData.full_name, `(${mergedData.role})`);
      setProfile(mergedData as Profile);
      setAuthState('authenticated');
    }
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
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut().catch(() => { });
          setAuthState('unauthenticated');
        } else {
          setAuthState('error');
        }
        return;
      }

      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        // We set session_loaded, the listener for INITIAL_SESSION will trigger fetchProfile
        setAuthState('session_loaded');
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
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Mount phase
    console.log("[AUTH] State Machine Starting...");
    initAuth();

    if (!supabase) return;

    // Subscription phase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Event Fired: ${event}`);

      // Task 3: Implement Correct Hydration Flow
      if (event === "INITIAL_SESSION" && currentSession?.user) {
        console.log("[AUTH] Session hydrated. Fetching profile...");
        setSession(currentSession);
        setUser(currentSession.user);
        setAuthState('session_loaded');
        await fetchProfile(currentSession.user.id);
      }

      if (event === "SIGNED_IN") {
        // Task 2: Remove Early Fetch from SIGNED_IN <-- Reverted: we need to fetch profile so AuthGate doesn't show "Account Not Configured".
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAuthState('session_loaded');
          await fetchProfile(currentSession.user.id);
        }
      }

      if (event === "SIGNED_OUT") {
        console.log("[AUTH] Signed out.");
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthState('unauthenticated');
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("[AUTH] Token refreshed.");
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      }
    });

    return () => {
      hasInitialized.current = false;
      subscription.unsubscribe();
    };
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
      business_id: role === 'super_admin' ? '' : '601576d8-9a10-476d-bad1-a1b46f5e830d',
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
