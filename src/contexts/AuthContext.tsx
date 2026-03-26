import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { callRPC } from '../lib/rpcClient';
import { identityCache } from '../lib/identityCache';
import { Profile } from '../types/database';

export type UserRole = 'admin' | 'manager' | 'staff' | 'owner' | 'kitchen' | 'ceo' | 'super_admin';

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
  shiftId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signInAsDemo: (role: UserRole, department?: string) => Promise<void>;
  refreshIdentity: () => Promise<void>;
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
  shiftId: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,
  signOut: async () => { },
  signInWithPassword: async () => ({ error: 'Not implemented' }),
  signInAsDemo: async () => { },
  refreshIdentity: async () => { },
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
  const [shiftId, setShiftId] = useState<string | null>(null);
  const isMounted = useRef(true);

  const isOrgAdmin = currentRole === 'admin' || currentRole === 'owner' || currentRole === 'ceo' || currentRole === 'super_admin';

  // 🔐 SHIFT GATE INTEGRATION
  useEffect(() => {
    const resolveShift = async () => {
      if (authorityStatus === 'authorized' && locationId) {
        try {
          const shift = await callRPC('staff', 'resolve_active_shift', {
            staff_id: staffId,
            branch_id: locationId,
            business_id: orgId,
            terminal_type: 'staff'
          });
          if (shift?.shift_id && isMounted.current) {
            setShiftId(shift.shift_id);
            console.log('[SHIFT] Active shift resolved:', shift.shift_id);
          }
        } catch (err) {
          console.warn('[SHIFT] No active shift found. Some actions will be blocked.');
        }
      }
    };

    resolveShift();
  }, [authorityStatus, locationId, staffId]);

  const resolveAuthority = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      console.log('[AUTH] No session found. Setting status = unauthorized');
      identityCache.clear();
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

    const userId = currentSession.user.id;
    const cached = identityCache.get(userId);

    // 🏆 SCL-02: Prevent Flicker
    // If we have a valid cache, we are 'authorized' immediately.
    if (cached && cached.role) {
      console.log('[AUTH] 🚀 Identity Bridge HIT: skipping loading state');
      if (isMounted.current) {
        setAuthorityStatus('authorized');
        setSession(currentSession);
        setUser(currentSession.user);
        setCurrentRole(cached.role);
        setOrgId(cached.business_id);
        setLocationId(cached.branch_id);
        setDepartmentId(cached.department_id);
        setDepartmentName(cached.department_name);
        setStaffId(cached.staff_id);
        setProfile({
          user_id: userId,
          role: cached.role,
          business_id: cached.business_id,
          full_name: cached.full_name || 'Staff'
        });
      }
    } else {
      if (isMounted.current) {
        setAuthorityStatus('loading');
      }
    }

    try {
      console.log("[AUTH] 🔥 Forensic resolution start");
      // 🔐 STEP 2: IDENTITY RESOLUTION (RPC Master Control)
      // This is the ONLY path to system readiness.
      const identity = await callRPC<any>('public', 'get_my_identity', {});
      // ✅ No idempotency key — get_my_identity is a READ, not a mutation
      console.log("[AUTH] ✅ Identity resolved:", identity);

      if (!identity || !identity.role) {
        console.error('[AUTH] ❌ Identity Resolution Failure: No role assigned.');
        if (isMounted.current) {
          setAuthorityStatus('unauthorized');
          setUser(currentSession.user);
          setSession(currentSession);
        }
        return;
      }

      console.log(`[AUTH] ✅ Identity Resolved via RPC: ${identity.role}`);

      // 🏢 CONSTRICTED BRANCH RESOLUTION PIPELINE (LAW 3: AUTH -> BRANCH)
      let resolvedBranchId = identity.branch_id;
      if (!resolvedBranchId) {
        const res = await callRPC<any>("public", "get_my_branches", {});
        // ✅ No idempotency key — get_my_branches is a READ, not a mutation
        const branches = res?.branches;

        if (!branches?.length) {
          console.warn("[ANTI-GRAVITY] No branches found");
        } else {
          resolvedBranchId = branches[0].id; // Deterministic Default
          console.log(`[AUTH] 🌿 Branch Auto-Resolved: ${resolvedBranchId}`);
        }
      }

      // 🦾 STEP 3: SYSTEM READINESS (State Derivation)
      if (isMounted.current) {
        setOrgId(identity.business_id);
        setLocationId(resolvedBranchId); // CRITICAL: This was the missing pipeline link bridging auth to hydration
        setDepartmentId(identity.department_id);
        setDepartmentName(identity.department_name);
        setStaffId(identity.staff_id);

        setProfile({
          user_id: currentSession.user.id,
          role: identity.role as any,
          business_id: identity.business_id,
          department: identity.department_id,
          full_name: currentSession.user.user_metadata?.full_name || 'User',
        });

        setUser(currentSession.user);
        setSession(currentSession);

        // Final Gate Unlock
        setCurrentRole(identity.role as UserRole);
        setAuthorityStatus('authorized');
        console.log('[AUTH] 🔓 Authority Gate: OPEN. Downstream SSOT hydration allowed.');
      }
    } catch (err) {
      console.error("[AUTH] 💥 Forensic resolution failure:", err);
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

  const signInAsDemo = async (role: UserRole) => {
    // Hardened Demo Login for Validation
    const demoEmail = `${role.toLowerCase()}@fobbs.com`;
    const demoPassword = 'password123';

    console.log(`[AUTH] 🛡️ Deterministic Demo Access: ${role}`);
    await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
  };

  // 🔄 Sync RPC Injection Context (Law: Identity flow)
  useEffect(() => {
    import('@/lib/rpcClient').then(mod => {
      mod.setRPCInjectionContext({ staffId, shiftId, authority, locationId });
    });
  }, [staffId, shiftId, authority, locationId]);

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
      shiftId,
      isLoading: authorityStatus === 'loading',
      isAuthenticated: !!session,
      role: currentRole,
      signOut,
      signInWithPassword,
      signInAsDemo,
      refreshIdentity: () => resolveAuthority(session)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
