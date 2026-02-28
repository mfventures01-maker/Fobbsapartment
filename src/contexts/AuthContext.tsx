import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type AuthState =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated'
  | 'error';

export interface Authority {
  role: string | null;
  businessId: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authority: Authority | null;
  authState: AuthState;
  authorityResolved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signInAsDemo: (role: string, departmentName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  authority: null,
  authState: 'initializing',
  authorityResolved: false,
  loading: true,
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
  signInAsDemo: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authorityState, setAuthorityState] = useState<Authority | null>(null);
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [authorityResolved, setAuthorityResolved] = useState<boolean>(false);

  const hasInitializedRef = useRef(false);
  const authRef = useRef<{ userId: string | null; state: AuthState }>({ userId: null, state: 'initializing' });

  const updateAuthState = (newState: AuthState) => {
    setAuthState(prev => {
      if (prev === 'authenticated' && newState !== 'authenticated') {
        return prev;
      }
      authRef.current.state = newState;
      return newState;
    });
  };

  const fetchAuthority = async (currentSession: Session) => {
    if (!supabase) return;
    const userId = currentSession.user.id;
    console.log("[AUTH] Fetching authority for user:", userId);

    try {
      const { data: memberships, error } = await supabase
        .from('business_memberships')
        .select(`
          role,
          business_id,
          department_id,
          departments(name)
        `)
        .eq('user_id', userId);

      if (error || !memberships || memberships.length === 0) {
        const profileRes = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileRes.data?.is_platform_admin) {
          console.log("PLATFORM ADMIN DETECTED");
          setAuthorityState({
            role: "super_admin",
            businessId: null,
            departmentId: null,
            departmentName: null
          });
          updateAuthState('authenticated');
          setAuthorityResolved(true);
          return;
        }

        console.error("[AUTH] Membership fetch failed or missing.");
        updateAuthState('unauthenticated');
        setAuthorityResolved(true);
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

      setAuthorityState({
        role: activeMembership.role,
        businessId: activeMembership.business_id,
        departmentId: activeMembership.department_id,
        departmentName: (activeMembership.departments as any)?.name ?? null
      });

      console.log("[AUTH] Authority loaded:", activeMembership.role);
      updateAuthState('authenticated');
      setAuthorityResolved(true);

    } catch (err) {
      console.error("[AUTH] Authority fetch exception:", err);
      updateAuthState('error');
      setAuthorityResolved(true);
    }
  };

  const initAuth = async () => {
    if (!supabase) {
      updateAuthState('error');
      return;
    }

    try {
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn("[AUTH] Session error on init:", error.message);
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut().catch(() => { });
          updateAuthState('unauthenticated');
        } else {
          updateAuthState('error');
        }
        setAuthorityResolved(true);
        return;
      }

      if (initialSession?.user) {
        authRef.current.userId = initialSession.user.id;
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchAuthority(initialSession);
      } else {
        console.log("[AUTH] No active session on init.");
        updateAuthState('unauthenticated');
        setAuthorityResolved(true);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("aborted")) {
        console.warn("[AUTH] Init aborted (non-fatal)");
        return;
      }
      console.error("Auth Init Critical Failure", err);
      updateAuthState('error');
      setAuthorityResolved(true);
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    initAuth();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Event Fired: ${event}`);

      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && currentSession?.user) {
        if (authRef.current.userId === currentSession.user.id && authRef.current.state === 'authenticated') return;
        authRef.current.userId = currentSession.user.id;
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchAuthority(currentSession);
      }

      if (event === "SIGNED_OUT") {
        console.log("[AUTH] Signed out.");
        authRef.current.userId = null;
        setSession(null);
        setUser(null);
        setAuthorityState(null);
        setAuthState('unauthenticated');
        setAuthorityResolved(true);
      }

      if (event === "TOKEN_REFRESHED") {
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

  const signInAsDemo = async (role: string, departmentName?: string) => {
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

    authRef.current.userId = mockId;
    setSession({ access_token: 'demo', token_type: 'bearer', user: mockUser } as any);
    setUser(mockUser);
    setAuthorityState({
      role,
      businessId: role === 'super_admin' ? null : '601576d8-9a10-476d-bad1-a1b46f5e830d',
      departmentId: departmentName ? 'mock-dept-id' : null,
      departmentName: departmentName || null
    });
    updateAuthState('authenticated');
    setAuthorityResolved(true);
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const loading = authState === 'initializing';

  const authority = useMemo(() => authorityState, [authorityState]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      authority,
      authState,
      authorityResolved,
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
