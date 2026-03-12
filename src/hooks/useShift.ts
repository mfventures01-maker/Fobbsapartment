import { useShiftState } from '@/contexts/ShiftContext';
import { SHIFT_STATUS } from '../constants/shiftStatus';

/**
 * Migration Hook: Redirects legacy useShift calls to the centralized ShiftContext.
 * This ensures "One Source of Truth" and prevents redundant DB queries.
 */
export function useShift() {
    const { shiftState, startShift, endShift, refreshShift } = useShiftState();

    const currentShift = (shiftState.status === SHIFT_STATUS.OPEN || shiftState.status === SHIFT_STATUS.DECLARATION_SUBMITTED)
        ? (shiftState as any).shift
        : null;

    return {
        currentShift,
        loading: shiftState.status === 'loading',
        startShift,
        endShift,
        refreshShift,
        status: shiftState.status // Extra info for advanced components
    };
}
