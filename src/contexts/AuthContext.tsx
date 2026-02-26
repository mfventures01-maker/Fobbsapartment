import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

import { Profile } from '@/types/db';

// Explicit finite states for auth hydration
export type AuthState =
  | 'initializing'      // App just mounted, checking local session
  | 'unauthenticated'   // Confirmed no session
  | 'authenticated'     // Session + Profile ready
  | 'error';            // Network/Hydration failed

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authState: AuthState;
  loading: boolean; // Computed from authState
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

  const hasInitializedRef = useRef(false);
  const authRef = useRef<{ userId: string | null; state: AuthState }>({ userId: null, state: 'initializing' });

  // Helper to safely transition state without reverting
  const updateAuthState = (newState: AuthState) => {
    setAuthState(prev => {
      if (prev === 'authenticated' && newState !== 'authenticated') {
        return prev;
      }
      authRef.current.state = newState;
      return newState;
    });
  };

  // Phase 1: fetchProfile must not call getSession
  const fetchProfile = async (currentSession: Session) => {
    if (!supabase) return;
    const userId = currentSession.user.id;
    console.log("[AUTH] Fetching profile for user:", userId);

    try {
      const profileRes = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileRes.error) {
        console.error("[AUTH] Profile fetch failed:", profileRes.error);
        updateAuthState('error');
        return;
      }

      const membershipRes = await supabase
        .from("business_memberships")
        .select("*")
        .eq("user_id", userId);

      if (membershipRes.error) {
        console.error("[AUTH] Membership fetch failed:", membershipRes.error);
        updateAuthState('error');
        return;
      }

      const memberships = membershipRes.data;

      // Check if platform admin first
      if (profileRes.data?.is_platform_admin) {
        console.log("PLATFORM ADMIN DETECTED");

        const mergedProfile = {
          ...(profileRes.data),
          role: "super_admin",
          business_id: null,
          department: null
        };

        console.log("[AUTH] Profile loaded for", mergedProfile.full_name, `(${mergedProfile.role})`);
        setProfile(mergedProfile as Profile);
        updateAuthState('authenticated');
        return;
      }

      // If not platform admin, enforce membership
      if (!memberships || memberships.length === 0 || !profileRes.data) {
        console.error("[AUTH] No valid membership/profile found.");
        updateAuthState('unauthenticated');
        return;
      }

      const rolePriority: Record<string, number> = {
        super_admin: 1,
        ceo: 2,
        manager: 3,
        staff: 4,
      };

      const sortedMemberships = [...memberships].sort(
        (a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
      );

      const activeMembership = sortedMemberships[0];
      const resolvedRole = activeMembership.role;
      const resolvedBusinessId = activeMembership.business_id;

      console.log("MEMBERSHIPS:", memberships);
      console.log("RESOLVED ROLE:", resolvedRole);

      if (!resolvedRole) {
        console.error("[AUTH] Unable to resolve user role.");
        updateAuthState('error');
        return;
      }

      const mergedProfile = {
        ...(profileRes.data),
        role: resolvedRole,
        business_id: resolvedBusinessId,
        department: activeMembership.department || null
      };

      console.log("[AUTH] Profile loaded for", mergedProfile.full_name, `(${mergedProfile.role})`);
      setProfile(mergedProfile as Profile);
      updateAuthState('authenticated');

    } catch (err) {
      console.error("[AUTH] Profile fetch exception:", err);
      updateAuthState('error');
    }
  };

  const initAuth = async () => {
    if (!supabase) {
      updateAuthState('error');
      return;
    }

    try {
      // Get the single authoritative session payload on startup
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn("[AUTH] Session error on init:", error.message);
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut().catch(() => { });
          updateAuthState('unauthenticated');
        } else {
          updateAuthState('error');
        }
        return;
      }

      if (initialSession?.user) {
        authRef.current.userId = initialSession.user.id;
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchProfile(initialSession);
      } else {
        console.log("[AUTH] No active session on init.");
        updateAuthState('unauthenticated');
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("aborted")) {
        console.warn("[AUTH] Init aborted (non-fatal)");
        return;
      }
      console.error("Auth Init Critical Failure", err);
      updateAuthState('error');
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Mount phase
    console.log("[AUTH] State Machine Starting...");
    initAuth();

    if (!supabase) return;

    // Subscription phase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Event Fired: ${event}`);

      if (event === "INITIAL_SESSION" && currentSession?.user) {
        if (authRef.current.userId === currentSession.user.id && authRef.current.state === 'authenticated') return;
        console.log("[AUTH] Session hydrated via INITIAL_SESSION.");
        authRef.current.userId = currentSession.user.id;
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfile(currentSession);
      }

      if (event === "SIGNED_IN" && currentSession?.user) {
        if (authRef.current.userId === currentSession.user.id && authRef.current.state === 'authenticated') {
          console.log("[AUTH] Redundant SIGNED_IN ignored.");
          return;
        }
        authRef.current.userId = currentSession.user.id;
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfile(currentSession);
      }

      if (event === "SIGNED_OUT") {
        console.log("[AUTH] Signed out.");
        authRef.current.userId = null;
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
      hasInitializedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not initialized' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInAsDemo = async (role: Profile['role'], department?: string) => {
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

    authRef.current.userId = mockId;
    setSession(mockSession);
    setUser(mockUser);
    setProfile(mockProfile);
    updateAuthState('authenticated');
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const loading = authState === 'initializing';

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
