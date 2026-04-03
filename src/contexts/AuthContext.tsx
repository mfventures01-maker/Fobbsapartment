import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { callRPC } from '../lib/rpcClient';
import { identityCache } from '../lib/identityCache';
import { Profile } from '../types/database';

export type UserRole = 'admin' | 'manager' | 'staff' | 'owner' | 'kitchen' | 'ceo' | 'super_admin';

export type AuthorityStatus = "loading" | "authorized" | "unauthorized";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ANTI-GRAVITY LAW §1: hydrated=true is the ONLY gate that permits       ║
// ║  downstream RPC calls. resolve_hydration_offline_safe is the truth RPC. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export interface Authority {
  status: AuthorityStatus;
  role: UserRole | null;
  businessId: string | null;
  branchId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  staffId: string | null;
  hydrated: boolean;
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
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signInAsDemo: (role: UserRole, department?: string) => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const AUTHORITY_INITIAL: Authority = {
  status: 'loading',
  role: null,
  businessId: null,
  branchId: null,
  departmentId: null,
  departmentName: null,
  staffId: null,
  hydrated: false,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  authorityStatus: 'loading',
  currentRole: null,
  authority: AUTHORITY_INITIAL,
  isOrgAdmin: false,
  orgId: null,
  locationId: null,
  departmentId: null,
  departmentName: null,
  profile: null,
  staffId: null,
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
  const [hydrated, setHydrated] = useState(false);
  const isMounted = useRef(true);

  const isOrgAdmin = currentRole === 'admin' || currentRole === 'owner' || currentRole === 'ceo' || currentRole === 'super_admin';



  // ── CORE IDENTITY RESOLUTION ───────────────────────────────────────────────
  const resolveAuthority = async (currentSession: Session | null) => {
    // ── TRACE POINT 1: AUTH EVENT ENTRY ──────────────────────────────────────
    console.log('[HYDRATION_TRACE] AUTH_EVENT', JSON.stringify({
      event: currentSession ? 'SESSION_FOUND' : 'NO_SESSION',
      sessionExists: !!currentSession
    }));

    if (!currentSession?.user) {
      identityCache.clear();
      if (isMounted.current) {
        setHydrated(false);
        setAuthorityStatus('unauthorized');
        setCurrentRole(null);
        setOrgId(null);
        setLocationId(null);
        setDepartmentId(null);
        setDepartmentName(null);
        setProfile(null);
        setStaffId(null);
        setUser(null);
        setSession(null);
      }
      return;
    }

    const userId = currentSession.user.id;

    // ── CACHE: Fast UI pre-render ONLY — hydration gate stays CLOSED ──────────
    const cached = identityCache.get(userId);
    if (cached && cached.role) {
      console.log('[AUTH] 🚀 Cache HIT: pre-rendering UI (hydration gate stays CLOSED until RPC)');
      if (isMounted.current) {
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
        setHydrated(false);
      }
    }

    // ── DETERMINISTIC HYDRATION: resolve_hydration_offline_safe ──────────────
    // Primary: new deterministic RPC (includes staff_id + active_shift)
    // Fallback: direct profiles table query (if RPC not yet deployed)
    const _hydrateStart = Date.now();
    try {
      // ── TRACE POINT 2: RPC INVOCATION ────────────────────────────────────
      console.log('[HYDRATION_TRACE] RPC_CALL:resolve_hydration_offline_safe', JSON.stringify({
        timestamp: new Date().toISOString(),
        attempt: true
      }));

      let profileData: any = null;

      // ╔══════════════════════════════════════════════════════════╗
      // ║ ANTI-GRAVITY LAW §2: resolve_hydration_offline_safe is   ║
      // ║ the single source of truth. Falls back to profiles table ║
      // ║ if RPC is not yet deployed. Never uses JWT role.         ║
      // ╚══════════════════════════════════════════════════════════╝
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('resolve_hydration_offline_safe');

      if (!rpcError && rpcData?.canHydrate) {
        // ✅ RPC succeeded
        profileData = rpcData;
      } else {
        // ⚠️ Fallback: direct profiles table query
        console.warn('[AUTH] ⚠️ RPC unavailable, falling back to profiles table:', rpcError?.message || 'canHydrate=false');

        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('role, branch_id, department, full_name')
          .eq('user_id', userId)
          .single();

        if (pError || !pData) {
          console.log('[HYDRATION_TRACE] RPC_RESPONSE:resolve_hydration_offline_safe', JSON.stringify({
            success: false,
            data: null,
            error: pError?.message || 'Profile not found'
          }));
          console.error('[AUTH] ❌ HARD STOP: Both RPC and profiles table failed.', pError);
          if (isMounted.current) {
            setHydrated(false);
            setAuthorityStatus('unauthorized');
            setUser(currentSession.user);
            setSession(currentSession);
          }
          return;
        }

        // Resolve business_id via branches table (avoids profiles.business_id column dependency)
        let resolvedBusinessId: string | null = null;
        if (pData.branch_id) {
          const { data: branchRow } = await supabase
            .from('branches')
            .select('business_id')
            .eq('id', pData.branch_id)
            .single();
          resolvedBusinessId = branchRow?.business_id ?? null;
        }

        profileData = {
          canHydrate: true,
          user_id: userId,
          role: pData.role,
          branch_id: pData.branch_id,
          business_id: resolvedBusinessId,
          staff_id: null,
          active_shift: null,
          full_name: pData.full_name,
          department: pData.department,
        };
      }

      // ── TRACE POINT 3: RESPONSE ───────────────────────────────────────────
      console.log('[HYDRATION_TRACE] RPC_RESPONSE:resolve_hydration_offline_safe', JSON.stringify({
        success: true,
        data: {
          role: profileData.role,
          branch_id: profileData.branch_id,
          canHydrate: profileData.canHydrate
        }
      }));

      // Build unified identity object
      const identity = {
        user_id: userId,
        role: profileData.role,
        branch_id: profileData.branch_id,
        business_id: profileData.business_id,
        department_id: profileData.department ?? null,
        department_name: profileData.department ?? null,
        staff_id: profileData.staff_id ?? null,
        active_shift: profileData.active_shift ?? null,
      };

      console.log('[AUTH] User ID:', currentSession.user.id);
      console.log('[AUTH] Profile (from resolve_hydration_offline_safe):', identity);
      console.log('[AUTH] Final Role:', identity.role);
      console.log('[AUTH] Branch ID:', identity.branch_id);

      // ── HARD STOP: No role ────────────────────────────────────────────────
      if (!identity.role) {
        console.error('[AUTH] ❌ HARD STOP: profiles.role is null.');
        if (isMounted.current) {
          setHydrated(false);
          setAuthorityStatus('unauthorized');
          setUser(currentSession.user);
          setSession(currentSession);
        }
        return;
      }

      // ── HARD STOP: Reject Supabase system roles ───────────────────────────
      const INVALID_ROLES = ['authenticated', 'anon', 'service_role', 'postgres'];
      if (INVALID_ROLES.includes(identity.role)) {
        console.error(`[AUTH] ❌ HARD STOP: System role "${identity.role}" must never reach frontend.`);
        if (isMounted.current) {
          setHydrated(false);
          setAuthorityStatus('unauthorized');
        }
        return;
      }

      console.log(`[AUTH] ✅ Business role confirmed: "${identity.role}"`);

      // ── BRANCH FALLBACK ───────────────────────────────────────────────────
      let resolvedBranchId = identity.branch_id;
      if (!resolvedBranchId) {
        console.warn('[AUTH] Branch ID missing — attempting get_my_branches()');
        const res = await callRPC<any>('public', 'get_my_branches', {});
        const branches = res?.branches;
        if (!branches?.length) {
          console.error('[AUTH] ❌ HARD STOP: No branches found.');
          if (isMounted.current) { setHydrated(false); setAuthorityStatus('unauthorized'); }
          return;
        }
        resolvedBranchId = branches[0].id;
        console.log(`[AUTH] 🌿 Branch Auto-Resolved: ${resolvedBranchId}`);
      }

      // ── WRITE CACHE ───────────────────────────────────────────────────────
      identityCache.set({
        user_id: userId,
        role: identity.role,
        business_id: identity.business_id,
        branch_id: resolvedBranchId,
        department_id: identity.department_id,
        department_name: identity.department_name,
        staff_id: identity.staff_id,
        full_name: currentSession.user.user_metadata?.full_name || '',
        timestamp: new Date().toISOString(),
      });

      // ── ATOMIC STATE COMMIT ───────────────────────────────────────────────
      if (isMounted.current) {
        setOrgId(identity.business_id);
        setLocationId(resolvedBranchId);
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
        setCurrentRole(identity.role as UserRole);

        // ╔══════════════════════════════════════════════════════════╗
        // ║ ANTI-GRAVITY LAW §3: hydrated=true is set LAST.         ║
        // ║ All setters above must complete before gate opens.       ║
        // ╚══════════════════════════════════════════════════════════╝
        setHydrated(true);
        setAuthorityStatus('authorized');

        // ── TRACE POINT 4 ─────────────────────────────────────────────────
        console.log('[HYDRATION_TRACE] AUTH_RESOLVED', JSON.stringify({
          user_id: currentSession.user.id,
          role: identity.role,
          business_id: identity.business_id,
          branch_id: resolvedBranchId,
          staff_id: identity.staff_id,
          hydrated: true
        }));

        // ── TRACE POINT 5 ─────────────────────────────────────────────────
        console.log('[HYDRATION_TRACE] HYDRATION_GATE', JSON.stringify({
          hydrated: true,
          allowDownstream: true,
          time_to_hydrate_ms: Date.now() - _hydrateStart
        }));

        console.log('[AUTH] 🔓 Authority Gate OPEN. Downstream SSOT enabled.');
      }
    } catch (err: any) {
      console.log('[HYDRATION_TRACE] RPC_RESPONSE:resolve_hydration_offline_safe', JSON.stringify({
        success: false,
        data: null,
        error: err?.message || String(err)
      }));
      console.error('[AUTH] 💥 Hydration failure:', err);
      if (isMounted.current) {
        setHydrated(false);
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
          setHydrated(false);
          setAuthorityStatus('unauthorized');
          setCurrentRole(null);
          setOrgId(null);
          setLocationId(null);
          setDepartmentId(null);
          setDepartmentName(null);
          setProfile(null);
          setStaffId(null);
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
    staffId,
    hydrated,
  };

  const signInAsDemo = async (role: UserRole) => {
    const demoEmail = `${role.toLowerCase()}@fobbs.com`;
    console.log(`[AUTH] 🛡️ Demo Access: ${role}`);
    await supabase.auth.signInWithPassword({ email: demoEmail, password: 'password123' });
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
