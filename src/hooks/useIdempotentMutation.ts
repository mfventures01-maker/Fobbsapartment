// 🛸 ANTI-GRAVITY: IDEMPOTENT MUTATION HOOK
// Law: "One user intent → one key → one database record. Forever."
// Guarantees: idempotency, mutex, persistence across retries, page-reload recovery.

import { useRef, useState, useEffect } from 'react';
import { callRPC } from '../lib/rpcClient';

const STORAGE_PREFIX = 'carss_pending_key_';

export function useIdempotentMutation<TParams = Record<string, any>, TResult = any>(
    terminal: 'public' | 'staff' | 'manager' | 'ceo' | 'super_admin',
    rpcName: string,
    options?: { persist?: boolean }
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestKey = useRef<string | null>(null);
    const storageKey = `${STORAGE_PREFIX}${rpcName}`;

    // 🔄 On mount: restore persisted key if page was reloaded mid-request
    useEffect(() => {
        if (options?.persist) {
            const persisted = sessionStorage.getItem(storageKey);
            if (persisted) {
                requestKey.current = persisted;
                console.log(`[IDEM] 🔄 Restored pending key for ${rpcName}: ${persisted.slice(0, 8)}`);
            }
        }
        return () => {
            // On unmount, do NOT clear the key — it must survive re-renders
        };
    }, []);

    const execute = async (params: TParams): Promise<TResult> => {
        if (isLoading) {
            console.warn(`[IDEM] ⚠️ Mutation already in progress: ${rpcName}. Blocking duplicate.`);
            throw new Error('Mutation already in progress. Please wait.');
        }

        // 🔑 Generate ONCE. Reuse on every retry.
        if (!requestKey.current) {
            requestKey.current = crypto.randomUUID();
            console.log(`[IDEM] 🔑 New key for ${rpcName}: ${requestKey.current.slice(0, 8)}`);
        } else {
            console.log(`[IDEM] ♻️ Reusing key for ${rpcName}: ${requestKey.current.slice(0, 8)}`);
        }

        // 💾 Persist for page-reload recovery
        if (options?.persist) {
            sessionStorage.setItem(storageKey, requestKey.current);
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await callRPC<TResult>(terminal, rpcName, {
                ...(params as any),
                _idempotency_key: requestKey.current
            });

            // ✅ Clear key only on confirmed success
            requestKey.current = null;
            if (options?.persist) sessionStorage.removeItem(storageKey);

            console.log(`[IDEM] ✅ Success: ${rpcName}`);
            return result;
        } catch (err: any) {
            // ❌ Keep key alive for retry — do NOT clear
            setError(err instanceof Error ? err : new Error(String(err)));
            console.error(`[IDEM] ❌ Failed: ${rpcName}. Key preserved for retry.`);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        requestKey.current = null;
        if (options?.persist) sessionStorage.removeItem(storageKey);
        setError(null);
        setIsLoading(false);
    };

    return { execute, isLoading, error, reset };
}
