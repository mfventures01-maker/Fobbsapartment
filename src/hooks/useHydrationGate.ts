import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQRMenuStore } from '../store/qrMenuStore';
import { useBarCartStore } from '../store/barCartStore';
import { useRoomBookingStore } from '../store/roomBookingStore';
import { usePOSStore } from '../store/posStore';

export function useHydrationGate() {
    const { authority, session } = useAuth();

    const branchId = authority.branchId;
    const staffId = authority.staffId;

    const qrStatus = useQRMenuStore((state) => state.status);
    const barStatus = useBarCartStore((state) => state.status);
    const bookingStatus = useRoomBookingStore((state) => state.status);
    const posStatus = usePOSStore((state) => state.status);

    const fetchQR = useQRMenuStore((state) => state.fetch);
    const fetchBar = useBarCartStore((state) => state.fetch);
    const fetchBookings = useRoomBookingStore((state) => state.fetch);
    const fetchPOS = usePOSStore((state) => state.fetch);

    useEffect(() => {
        // Only hydration-gate if we have a valid session and authority
        if (session && branchId) {
            // 🛸 AG INJECTION: Concurrent Hydration of all domain slices
            fetchQR(branchId);
            fetchBar(branchId);
            fetchBookings(branchId);

            // Staff-only domain (POS/Shifts)
            if (staffId) {
                fetchPOS(branchId, staffId);
            }
        }
    }, [session, branchId, staffId]);

    // Mandatory slices that must succeed before releasing the gate
    const coreSlices = [qrStatus, barStatus, bookingStatus];

    // If staff, posStatus must also succeed
    if (staffId) coreSlices.push(posStatus);

    const allSuccess = coreSlices.every((s) => s === 'success');

    // Diagnostic log for the forensic trace
    if (allSuccess) {
        console.log('[HYDRATION_TRACE] HYDRATION_GATE: ALL SLICES SYNCHRONIZED ⚡');
    }

    return allSuccess;
}
