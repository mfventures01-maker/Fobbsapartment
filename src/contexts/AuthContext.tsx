import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/database';

export type UserRole = 'ceo' | 'manager' | 'staff' | 'super_admin' | 'owner' | 'kitchen';

export type AuthorityStatus = "loading" | "authorized" | "unauthorized";

export interface Authority {
  status: AuthorityStatus;
  role: UserRole | null;
  businessId: string | null;
  branchId: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authorityStatus: AuthorityStatus;
  currentRole: UserRole | null;
  authority: Authority;
  isOrgAdmin: boolean;
  orgId: string | null;
  locationId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  profile: Profile | null;
  staffId: string | null;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  authorityStatus: 'loading',
  currentRole: null,
  authority: {
    status: 'loading',
    role: null,
    businessId: null,
    branchId: null,
    departmentId: null,
    departmentName: null,
  },
  isOrgAdmin: false,
  orgId: null,
  locationId: null,
  departmentId: null,
  departmentName: null,
  profile: null,
  staffId: null,
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authorityStatus, setAuthorityStatus] = useState<AuthorityStatus>('loading');
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const isMounted = useRef(true);

  const isOrgAdmin = currentRole === 'ceo' || currentRole === 'owner' || currentRole === 'super_admin';

  const resolveAuthority = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      console.log('[AUTH] No session found. Setting status = unauthorized');
      if (isMounted.current) {
        setAuthorityStatus('unauthorized');
        setCurrentRole(null);
        setOrgId(null);
        setLocationId(null);
        setDepartmentId(null);
        setDepartmentName(null);
        setProfile(null);
        setUser(null);
        setSession(null);
      }
      return;
    }

    console.log('[AUTH] Initializing Authority Resolution for:', currentSession.user.id);
    setAuthorityStatus('loading');

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
        console.log('[AUTH] No membership found. Setting status = unauthorized');
        if (isMounted.current) {
          setAuthorityStatus('unauthorized');
          setCurrentRole(null);
          setOrgId(null);
          setLocationId(null);
          setDepartmentId(null);
          setDepartmentName(null);
          setProfile(null);
          setUser(currentSession.user);
          setSession(currentSession);
        }
        return;
      }

      console.log('[AUTH] Authority Resolved:', membership.role);
      console.log('[IDENTITY]', {
        role: membership.role,
        userId: currentSession.user.id,
      });
      if (isMounted.current) {
        setAuthorityStatus('authorized');
        setCurrentRole(membership.role as UserRole);
        setOrgId(membership.business_id);
        setLocationId(membership.branch_id);
        setDepartmentId(membership.department_id);
        setDepartmentName((membership.departments as any)?.name ?? null);
        setProfile({
          user_id: currentSession.user.id,
          role: membership.role as any,
          business_id: membership.business_id,
          department: membership.department_id,
          full_name: currentSession.user.user_metadata?.full_name || 'User',
        });
        setUser(currentSession.user);
        setSession(currentSession);

        // RESOLVE STAFF IDENTITY (DETERMINISTIC PATCH)
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();

        if (staff && isMounted.current) {
          console.log('[AUTH] Operational Staff Resolved:', staff.id);
          setStaffId(staff.id);
        }
      }
    } catch (err) {
      console.error("[AUTH] Forensic resolution failure:", err);
      if (isMounted.current) {
        setAuthorityStatus('unauthorized');
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[AUTH] Initial Session Check');
      resolveAuthority(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Event: ${event}`);
      if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setAuthorityStatus('unauthorized');
          setCurrentRole(null);
          setOrgId(null);
          setLocationId(null);
          setDepartmentId(null);
          setDepartmentName(null);
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      } else if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
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

  const authority: Authority = {
    status: authorityStatus,
    role: currentRole,
    businessId: orgId,
    branchId: locationId,
    departmentId,
    departmentName,
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      authority,
      authorityStatus,
      currentRole,
      isOrgAdmin,
      orgId,
      locationId,
      departmentId,
      departmentName,
      profile,
      staffId,
      signOut,
      signInWithPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
