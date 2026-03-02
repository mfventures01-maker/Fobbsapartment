import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type UserRole = 'ceo' | 'manager' | 'staff' | 'super_admin' | 'owner';

export type AuthorityState =
  | { status: 'loading' }
  | { status: 'authorized'; role: UserRole; businessId: string | null; branchId: string | null; departmentId: string | null; departmentName: string | null }
  | { status: 'unauthorized' };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authority: AuthorityState;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  authority: { status: 'loading' },
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authority, setAuthority] = useState<AuthorityState>({ status: 'loading' });
  const isMounted = useRef(true);

  const resolveAuthority = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      console.log('[FORENSIC] No session found. Setting status to unauthorized.');
      if (isMounted.current) {
        setAuthority({ status: 'unauthorized' });
        setUser(null);
        setSession(null);
      }
      return;
    }

    console.log('[FORENSIC] Resolving authority for:', currentSession.user.id);

    try {
      const { data: membership, error } = await supabase
        .from('business_memberships')
        .select(`
          role,
          business_id,
          branch_id,
          department_id,
          departments(name)
        `)
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!membership) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_platform_admin')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();

        if (profile?.is_platform_admin) {
          if (isMounted.current) {
            setAuthority({
              status: 'authorized',
              role: 'super_admin',
              businessId: null,
              branchId: null,
              departmentId: null,
              departmentName: null
            });
            setUser(currentSession.user);
            setSession(currentSession);
          }
          return;
        }

        if (isMounted.current) {
          setAuthority({ status: 'unauthorized' });
          setUser(currentSession.user);
          setSession(currentSession);
        }
        return;
      }

      console.log('[FORENSIC] Authority Resolved:', membership.role);
      if (isMounted.current) {
        setAuthority({
          status: 'authorized',
          role: membership.role as UserRole,
          businessId: membership.business_id,
          branchId: membership.branch_id,
          departmentId: membership.department_id,
          departmentName: (membership.departments as any)?.name ?? null
        });
        setUser(currentSession.user);
        setSession(currentSession);
      }
    } catch (err) {
      console.error("[FORENSIC] Authority resolution error:", err);
      if (isMounted.current) {
        setAuthority({ status: 'unauthorized' });
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      resolveAuthority(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        setAuthority({ status: 'unauthorized' });
        setUser(null);
        setSession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        resolveAuthority(currentSession);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      authority,
      signOut,
      signInWithPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
