import { useShiftState } from '@/contexts/ShiftContext';

/**
 * Migration Hook: Redirects legacy useShift calls to the centralized ShiftContext.
 * This ensures "One Source of Truth" and prevents redundant DB queries.
 */
export function useShift() {
    const { shiftState, startShift, endShift, refreshShift } = useShiftState();

    return {
        currentShift: shiftState.status === 'active' ? shiftState.shift : null,
        loading: shiftState.status === 'loading',
        startShift,
        endShift,
        refreshShift,
        status: shiftState.status // Extra info for advanced components
    };
}
