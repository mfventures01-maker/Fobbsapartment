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
// ║  downstream RPC calls. It is set ONLY after get_my_identity() succeeds. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export interface Authority {
  status: AuthorityStatus;
  role: UserRole | null;
  businessId: string | null;
  branchId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  /**
   * hydrated=true means: profile role has been verified by the backend RPC.
   * hydrated=false means: do NOT execute any RPC calls — identity is unconfirmed.
   */
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
  shiftId: string | null;
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
  hydrated: false,       // ← Gate starts CLOSED
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

  // ── Hydration flag: only true after RPC confirmation ──────────────────────
  const [hydrated, setHydrated] = useState(false);

  const isMounted = useRef(true);

  const isOrgAdmin = currentRole === 'admin' || currentRole === 'owner' || currentRole === 'ceo' || currentRole === 'super_admin';

  // ── SHIFT GATE: only fires when fully hydrated ────────────────────────────
  useEffect(() => {
    const resolveShift = async () => {
      // ⛔ HYDRATION GATE — block shift resolution until identity is confirmed
      if (!hydrated || !locationId) {
        console.log('[SHIFT] ⛔ Hydration gate: blocking shift resolution (hydrated=%s, branchId=%s)', hydrated, locationId);
        return;
      }
      try {
        const shift = await callRPC('staff', 'resolve_active_shift', {
          staff_id: staffId,
          branch_id: locationId,
          business_id: orgId,
          terminal_type: 'staff'
        });
        if (shift?.shift_id && isMounted.current) {
          setShiftId(shift.shift_id);
          console.log('[SHIFT] ✅ Active shift resolved:', shift.shift_id);
        }
      } catch (err) {
        console.warn('[SHIFT] No active shift found. Some actions will be blocked.');
      }
    };

    resolveShift();
  }, [hydrated, locationId, staffId]);

  // ── CORE IDENTITY RESOLUTION ───────────────────────────────────────────────
  const resolveAuthority = async (currentSession: Session | null) => {
    // ── TRACE POINT 1: AUTH EVENT ENTRY ─────────────────────────────────────
    console.log('[HYDRATION_TRACE] AUTH_EVENT', JSON.stringify({
      event: currentSession ? 'SESSION_FOUND' : 'NO_SESSION',
      sessionExists: !!currentSession
    }));

    if (!currentSession?.user) {
      console.log('[AUTH] No session found. Setting status = unauthorized');
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
        setShiftId(null);
        setUser(null);
        setSession(null);
      }
      return;
    }

    const userId = currentSession.user.id;

    // ── CACHE: Fast UI pre-render ONLY — does NOT unlock hydration gate ──────
    // The cache populates role/branch visually to prevent flicker,
    // but hydrated stays FALSE until the RPC confirms identity below.
    const cached = identityCache.get(userId);
    if (cached && cached.role) {
      console.log('[AUTH] 🚀 Identity Bridge HIT: pre-rendering from cache (hydration gate stays CLOSED until RPC)');
      if (isMounted.current) {
        // Pre-populate UI state for immediate render — status stays 'loading'
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
        // NOTE: authorityStatus stays 'loading', hydrated stays false
        // Downstream is blocked until RPC confirms below
      }
    } else {
      if (isMounted.current) {
        setAuthorityStatus('loading');
        setHydrated(false);
      }
    }

    // ── RPC MASTER RESOLUTION: THE ONLY PATH TO SYSTEM READINESS ─────────────
    const _hydrateStart = Date.now();
    try {
      // ── TRACE POINT 2: RPC INVOCATION ──────────────────────────────────────
      console.log('[HYDRATION_TRACE] RPC_CALL:get_my_identity', JSON.stringify({
        timestamp: new Date().toISOString(),
        attempt: true
      }));

      // ╔══════════════════════════════════════════════════════════╗
      // ║ ANTI-GRAVITY LAW §2: Role MUST come from business_memberships  ║
      // ║ via get_my_identity(). Supabase Auth role is NEVER used.       ║
      // ╚══════════════════════════════════════════════════════════╝
      const identity = await callRPC<any>('public', 'get_my_identity', {});

      // ── TRACE POINT 3: RPC RESPONSE ────────────────────────────────────────
      console.log('[HYDRATION_TRACE] RPC_RESPONSE:get_my_identity', JSON.stringify({
        success: !!identity,
        data: identity,
        error: null
      }));

      // ── REQUIRED VERIFICATION LOGS ──────────────────────────────
      console.log('[AUTH] User ID:', currentSession.user.id);
      console.log('[AUTH] Profile (from get_my_identity):', identity);
      console.log('[AUTH] Final Role:', identity?.role);
      console.log('[AUTH] Branch ID:', identity?.branch_id);

      // ── HARD STOP: No role = no access ──────────────────────────
      if (!identity || !identity.role) {
        console.error('[AUTH] ❌ HARD STOP: Identity Resolution Failure. No role assigned by get_my_identity().');
        if (isMounted.current) {
          setHydrated(false);
          setAuthorityStatus('unauthorized');
          setUser(currentSession.user);
          setSession(currentSession);
        }
        return;
      }

      // ── HARD STOP: Reject invalid/Supabase system roles ─────────
      const INVALID_ROLES = ['authenticated', 'anon', 'service_role', 'postgres'];
      if (INVALID_ROLES.includes(identity.role)) {
        console.error(`[AUTH] ❌ HARD STOP: Supabase system role detected ("${identity.role}"). This must never reach the frontend.`);
        if (isMounted.current) {
          setHydrated(false);
          setAuthorityStatus('unauthorized');
        }
        return;
      }

      console.log(`[AUTH] ✅ Business role confirmed via RPC: "${identity.role}"`);

      // ── BRANCH RESOLUTION (fallback if not in identity) ──────────
      let resolvedBranchId = identity.branch_id;
      if (!resolvedBranchId) {
        console.warn('[AUTH] Branch ID missing from identity — attempting get_my_branches()');
        const res = await callRPC<any>('public', 'get_my_branches', {});
        const branches = res?.branches;
        if (!branches?.length) {
          console.error('[AUTH] ❌ HARD STOP: No branches found. Cannot complete hydration.');
          if (isMounted.current) {
            setHydrated(false);
            setAuthorityStatus('unauthorized');
          }
          return;
        }
        resolvedBranchId = branches[0].id;
        console.log(`[AUTH] 🌿 Branch Auto-Resolved: ${resolvedBranchId}`);
      }

      // ── WRITE VERIFIED IDENTITY TO CACHE ─────────────────────────
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

      // ── ATOMIC STATE COMMIT: All or nothing ───────────────────────
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

        // ── TRACE POINT 4: AUTH STATE RESOLUTION ───────────────────────────
        console.log('[HYDRATION_TRACE] AUTH_RESOLVED', JSON.stringify({
          user_id: currentSession.user.id,
          role: identity.role,
          business_id: identity.business_id,
          branch_id: resolvedBranchId,
          hydrated: true
        }));

        // ── TRACE POINT 5: HYDRATION GATE DECISION ─────────────────────────
        console.log('[HYDRATION_TRACE] HYDRATION_GATE', JSON.stringify({
          hydrated: true,
          allowDownstream: true,
          time_to_hydrate_ms: Date.now() - _hydrateStart
        }));

        console.log('[AUTH] 🔓 Authority Gate: OPEN. Hydration complete. Downstream SSOT enabled.');
        console.log('[AUTH] Hydration summary:', {
          role: identity.role,
          branch_id: resolvedBranchId,
          business_id: identity.business_id,
          staff_id: identity.staff_id,
        });
      }
    } catch (err: any) {
      // ── TRACE POINT 3 (ERROR PATH): RPC RESPONSE ───────────────────────────
      console.log('[HYDRATION_TRACE] RPC_RESPONSE:get_my_identity', JSON.stringify({
        success: false,
        data: null,
        error: err?.message || String(err)
      }));
      console.error('[AUTH] 💥 Forensic resolution failure:', err);
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
          setShiftId(null);
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

  // ── AUTHORITY OBJECT: single shape consumed by all downstream contexts ────
  const authority: Authority = {
    status: authorityStatus,
    role: currentRole,
    businessId: orgId,
    branchId: locationId,
    departmentId,
    departmentName,
    hydrated,  // ← the gate
  };

  const signInAsDemo = async (role: UserRole) => {
    const demoEmail = `${role.toLowerCase()}@fobbs.com`;
    const demoPassword = 'password123';
    console.log(`[AUTH] 🛡️ Deterministic Demo Access: ${role}`);
    await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
  };

  // 🔄 Sync RPC Injection Context (Law: Identity must flow before any RPC)
  useEffect(() => {
    // Only inject when hydrated — RPCClient must not send stale/null context
    if (hydrated) {
      import('@/lib/rpcClient').then(mod => {
        mod.setRPCInjectionContext({ staffId, shiftId, authority, locationId });
      });
    }
  }, [hydrated, staffId, shiftId, authority, locationId]);

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
