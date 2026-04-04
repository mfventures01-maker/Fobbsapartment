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
  user_id: string | null;
  role: string | null;
  branchId: string | null;
  businessId: string | null;
  staffId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  hydrated: boolean;
  status: AuthorityStatus;
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
  user_id: null,
  role: null,
  branchId: null,
  businessId: null,
  staffId: null,
  departmentId: null,
  departmentName: null,
  hydrated: false,
  status: 'loading',
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
  const [authority, setAuthority] = useState<Authority>(AUTHORITY_INITIAL);
  const [profile, setProfile] = useState<Profile | null>(null);
  const isMounted = useRef(true);

  const isOrgAdmin = authority.role === 'admin' || authority.role === 'owner' || authority.role === 'ceo' || authority.role === 'super_admin';



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
        setAuthority(AUTHORITY_INITIAL);
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
        setAuthority({
          ...AUTHORITY_INITIAL,
          user_id: userId,
          role: cached.role,
          branchId: cached.branch_id,
          businessId: cached.business_id,
          staffId: cached.staff_id,
          departmentId: cached.department_id,
          departmentName: cached.department_name,
          status: 'authorized',
          hydrated: false // Gate stays closed until refreshed
        });
        setProfile({
          user_id: userId,
          role: cached.role as any,
          business_id: cached.business_id,
          full_name: cached.full_name || 'Staff'
        });
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
        // ⚠️ Fallback: direct profiles table query + staff_profiles join
        console.warn('[AUTH] ⚠️ RPC unavailable, falling back to profiles table join');

        const { data: profileWithStaff, error: pError } = await supabase
          .from('profiles')
          .select(`
            role, 
            branch_id, 
            department, 
            full_name,
            staff_profiles (
              id,
              full_name,
              role
            )
          `)
          .eq('user_id', userId)
          .maybeSingle();

        if (pError) {
          console.error('[HYDRATION_TRACE] SQL_ERROR: fallback failure', pError);
          // Hard fail ONLY on database error, not record absence
          if (isMounted.current) {
            setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' });
          }
          return;
        }

        // Case C: No profile found
        if (!profileWithStaff) {
          console.warn('[HYDRATION_TRACE] Case C: No profile found for user');
          if (isMounted.current) {
            setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' });
          }
          return;
        }

        // Case B: Profile exists, staff link might be null (soft join)
        // Note: PostgREST returns related object for 1:1 or array for 1:M.
        // staff_profiles is expected to be 1:1 in this context.
        const staffRaw = (profileWithStaff as any).staff_profiles;
        const staff = Array.isArray(staffRaw) ? staffRaw[0] : staffRaw;

        // Resolve business_id via branches table
        let resolvedBusinessId: string | null = null;
        if (profileWithStaff.branch_id) {
          const { data: branchRow } = await supabase
            .from('branches')
            .select('business_id')
            .eq('id', profileWithStaff.branch_id)
            .single(); // Branches resolution remains strict
          resolvedBusinessId = branchRow?.business_id ?? null;
        }

        // Truth-aligned resolution: accept what exists
        profileData = {
          canHydrate: true,
          user_id: userId,
          role: profileWithStaff.role,
          branch_id: profileWithStaff.branch_id,
          business_id: resolvedBusinessId,
          staff_id: staff?.id || null, // ✅ LAW 6: Partial authority OK
          active_shift: null,
          full_name: profileWithStaff.full_name,
          department: profileWithStaff.department,
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
          setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' });
        }
        return;
      }

      // ── HARD STOP: Reject Supabase system roles ───────────────────────────
      const INVALID_ROLES = ['authenticated', 'anon', 'service_role', 'postgres'];
      if (INVALID_ROLES.includes(identity.role)) {
        console.error(`[AUTH] ❌ HARD STOP: System role "${identity.role}" must never reach frontend.`);
        if (isMounted.current) {
          setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' });
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
          if (isMounted.current) { setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' }); }
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
        const authorityData: Authority = {
          user_id: userId,
          role: profileData.role,
          branchId: resolvedBranchId,
          businessId: profileData.business_id,
          staffId: profileData.staff_id,
          departmentId: profileData.department ?? null,
          departmentName: profileData.department ?? null,
          hydrated: true,
          status: 'authorized'
        };

        // 🏅 [ANTI-GRAVITY] STEP 1 & 2: PORTAL COMMIT (L1-L2)
        console.log('[HYDRATION_TRACE] IDENTITY_COMMIT', JSON.stringify({
          userId: authorityData.user_id,
          role: authorityData.role,
          businessId: authorityData.businessId,
          branchId: authorityData.branchId,
          staffId: authorityData.staffId,
          status: authorityData.status,
          hydrated: true
        }));

        setAuthority(authorityData);
        setProfile({
          user_id: userId,
          role: profileData.role as any,
          business_id: profileData.business_id,
          full_name: profileData.full_name || 'User',
          department: profileData.department
        });
        setUser(currentSession.user);
        setSession(currentSession);

        // ── TRACE POINT 4 ─────────────────────────────────────────────────
        console.log('[HYDRATION_TRACE] AUTH_RESOLVED', JSON.stringify({
          user_id: currentSession.user.id,
          role: authorityData.role,
          business_id: authorityData.businessId,
          branch_id: authorityData.branchId,
          staff_id: authorityData.staffId,
          hydrated: true
        }));

        // ── TRACE POINT 5 ─────────────────────────────────────────────────
        console.log('[HYDRATION_TRACE] LAYER_2_CONTEXT_RESOLVED', JSON.stringify({
          staff_id: authorityData.staffId ?? 'null',
          business_id: authorityData.businessId ?? 'null',
          branch_id: authorityData.branchId ?? 'null'
        }));

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
        setAuthority({ ...AUTHORITY_INITIAL, status: 'unauthorized' });
      }
    }
  };

  useEffect(() => {
    if (authority.hydrated) {
      import('@/lib/rpcClient').then(mod => {
        mod.setRPCInjectionContext({
          staffId: authority.staffId,
          authority,
          locationId: authority.branchId
        });
      });
    }
  }, [authority]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[AUTH] Initial Session Check');
      resolveAuthority(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH] Event: ${event}`);
      if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setAuthority(AUTHORITY_INITIAL);
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
      authorityStatus: authority.status,
      currentRole: authority.role as any,
      isOrgAdmin,
      orgId: authority.businessId,
      locationId: authority.branchId,
      departmentId: authority.departmentId,
      departmentName: authority.departmentName,
      profile,
      staffId: authority.staffId,
      isLoading: authority.status === 'loading',
      isAuthenticated: !!session,
      role: authority.role as any,
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
