import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';

/**
 * 🛡️ CARSS VERIFIER HOOK
 * Provides forensic-grade console reporting for anti-gravity determinism.
 * Validates Layer 1-4 state alignment.
 */
export function useCarssVerifier() {
    const { authority } = useAuth();
    const { shiftState } = useShiftState();

    useEffect(() => {
        // Only run report once we reach initial hydration or any gate update
        if (authority.status === 'loading') return;

        const report = {
            'LAYER 1 (Auth)': {
                result: authority.user_id ? '✅ VALID' : '❌ MISSING',
                id: authority.user_id || 'N/A'
            },
            'LAYER 2 (Branch)': {
                result: authority.branchId ? '✅ RESOLVED' : '⚠️ PENDING',
                id: authority.branchId || 'N/A'
            },
            'LAYER 3 (Staff)': {
                result: authority.staffId ? '✅ HYDRATED' : '❌ NULL',
                id: authority.staffId || 'N/A'
            },
            'LAYER 4 (Shift)': {
                result: shiftState.status === 'loading' ? '⏳ LOADING' : '✅ DETERMINISTIC',
                id: shiftState.status.toUpperCase()
            }
        };

        if (authority.hydrated) {
            console.group('🛸 [CARSS_VERIFIER] FORENSIC STATE REPORT');
            console.table(report);

            const isFullyDeterministic = authority.user_id && authority.branchId && authority.staffId && shiftState.status !== 'loading';

            if (isFullyDeterministic) {
                console.log('%c✅ SYSTEM_VERIFIED: ABSOLUTE DETERMINISM ACHIEVED (LAYER 1-4)', 'color: #10b981; font-weight: bold;');
            } else {
                console.log('%c⚠️ SYSTEM_PENDING: Resolving final hydration gates...', 'color: #f59e0b; font-weight: bold;');
            }
            console.groupEnd();
        }
    }, [authority, shiftState.status]);
}
