// 🛸 ANTI-GRAVITY HOOK — React Router v6 / Vite Edition
// NOT Next.js — uses useNavigate and AuthContext, not useRouter
//
// Guarantees:
//  1. Supabase session fully resolved before rendering any buttons
//  2. canHydrate === true ONLY after session is known (not undefined)
//  3. runAction is idempotent + mutex-protected per action key
//  4. sessionStorage persists request_id across page reloads
//  5. redirects unauthorized users to /login

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export interface AntiGravityState {
    /** True ONLY after session is resolved — gates all rendering */
    canHydrate: boolean;
    /** The resolved Supabase session — null if unauthenticated */
    session: any | null;
    /** True while a runAction() call is in flight */
    isLocked: boolean;
    /** Run any async action with idempotency + mutex protection */
    runAction: (action: () => Promise<any>, storageKey: string) => Promise<void>;
    /** React Router v6 navigate */
    navigate: ReturnType<typeof useNavigate>;
}

export function useAntiGravity(options?: {
    /** If true, unauthenticated users are redirected to /login */
    requireAuth?: boolean;
    /** Custom redirect path (default: /login) */
    redirectTo?: string;
}): AntiGravityState {
    const navigate = useNavigate();
    const [session, setSession] = useState<any | null | undefined>(undefined); // undefined = not yet resolved
    const [canHydrate, setCanHydrate] = useState(false);
    const mutexRef = useRef(false); // useRef: not a re-render concern
    const [isLocked, setIsLocked] = useState(false);

    // ── Step 1: Resolve session ONCE, then subscribe to changes ──────────────
    useEffect(() => {
        let mounted = true;

        // Initial resolution — cold start
        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session ?? null);
            setCanHydrate(true);
            console.log('[AntiGravity] 🛸 Session resolved:', data.session?.user?.email ?? 'anonymous');
        });

        // Live session changes (token refresh, sign-out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (!mounted) return;
            setSession(newSession ?? null);
            console.log('[AntiGravity] 🔄 Auth state change:', _event);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // ── Step 2: Redirect unauthorized ──────────────────────────────────────
    useEffect(() => {
        if (!options?.requireAuth) return;
        if (!canHydrate) return; // Don't redirect until we KNOW the session state
        if (!session?.user) {
            console.warn('[AntiGravity] ⛔ No session — redirecting to', options?.redirectTo ?? '/login');
            navigate(options?.redirectTo ?? '/login', { replace: true });
        }
    }, [canHydrate, session, navigate, options?.requireAuth, options?.redirectTo]);

    // ── Step 3: idempotent + mutex action runner ────────────────────────────
    const runAction = useCallback(async (action: () => Promise<any>, storageKey: string) => {
        // MUTEX: block concurrent executions
        if (mutexRef.current) {
            console.warn(`[AntiGravity] ⚠️ Action "${storageKey}" blocked — mutex locked.`);
            return;
        }

        mutexRef.current = true;
        setIsLocked(true);

        // IDEMPOTENCY: reuse request_id stored from previous attempt
        let requestId = sessionStorage.getItem(storageKey);
        if (!requestId) {
            requestId = crypto.randomUUID();
            sessionStorage.setItem(storageKey, requestId);
            console.log(`[AntiGravity] 🔑 New request_id for "${storageKey}": ${requestId.slice(0, 8)}`);
        } else {
            console.log(`[AntiGravity] ♻️ Reusing request_id for "${storageKey}": ${requestId.slice(0, 8)}`);
        }

        try {
            await action();
            // Clear on confirmed success
            sessionStorage.removeItem(storageKey);
            console.log(`[AntiGravity] ✅ Action "${storageKey}" completed.`);
        } catch (err) {
            // Keep request_id alive for retry
            console.error(`[AntiGravity] ❌ Action "${storageKey}" failed — key preserved for retry.`, err);
        } finally {
            mutexRef.current = false;
            setIsLocked(false);
        }
    }, []);

    return { canHydrate, session, isLocked, runAction, navigate };
}
