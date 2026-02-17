
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signInAsDemo: (role: Profile['role'], department?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
  signInAsDemo: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to safely fetch profile
  const _fetchProfilePayload = async (userId: string, currentSession: Session) => {
    try {
      console.log(`[AUTH] Fetching profile for user: ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error("[AUTH] Profile fetch error:", error.message);
        return null;
      }

      if (data) {
        console.log(`[AUTH] Profile loaded for ${data.full_name || userId} (${data.role})`);
        return data as Profile;
      }
    } catch (err) {
      console.error("[AUTH] Profile fetch exception:", err);
    }
    return null;
  };

  const initAuth = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get Session
    const { data: { session: initialSession }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn("[AUTH] Session error on init:", error.message);
      if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut().catch(() => { });
      }
      setLoading(false);
      return;
    }

    // 2. Hydrate State
    if (initialSession?.user) {
      console.log("[AUTH] Found active session, hydrating profile...");
      setSession(initialSession);
      setUser(initialSession.user);

      const profileData = await _fetchProfilePayload(initialSession.user.id, initialSession);
      if (profileData) {
        setProfile(profileData);
      }
    } else {
      console.log("[AUTH] No active session on init.");
    }

    // 3. Ready
    setLoading(false);
  };

  useEffect(() => {
    // Mount phase
    console.log("[AUTH] AuthProvider mounting...");
    initAuth();

    // Subscription phase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[AUTH] Auth Event: ${event}`);

      if (event === 'SIGNED_OUT') {
        console.log("[AUTH] Clearing session...");
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          console.log("[AUTH] Session updated/restored.");
          // Only set loading true if we interpret this as a full reload needed, 
          // but for TOKEN_REFRESHED we might want to stay silent or just update session.
          // For SIGNED_IN (login), we want to show loading until profile is ready.
          if (event === 'SIGNED_IN') setLoading(true);

          setSession(newSession);
          setUser(newSession.user);

          // Always refresh profile on these events to ensure sync
          const profileData = await _fetchProfilePayload(newSession.user.id, newSession);
          if (profileData) setProfile(profileData);

          setLoading(false);
        }
      } else if (event === 'INITIAL_SESSION') {
        // Handled by initAuth usually, but good to have
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
    setLoading(true);
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
    setLoading(false);
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, signInWithPassword, signInAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
