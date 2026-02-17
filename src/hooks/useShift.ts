
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Shift, ShiftReconciliation } from '@/types/db';
import toast from 'react-hot-toast';

export function useShift() {
    const { user, profile } = useAuth();
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setCurrentShift(null);
            setLoading(false);
            return;
        }

        const fetchShift = async () => {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('staff_id', user.id)
                .eq('status', 'open')
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching shift:', error);
            } else {
                setCurrentShift(data);
            }
            setLoading(false);
        };

        fetchShift();

        // Subscribe to shift changes? Ideally yes for realtime enforcement
        const channel = supabase
            .channel(`shift_updates_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shifts', filter: `staff_id=eq.${user.id}` },
                (payload) => {
                    fetchShift();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const startShift = async () => {
        if (!user || !profile) return;
        if (currentShift) return;

        const { data, error } = await supabase
            .from('shifts')
            .insert({
                staff_id: user.id,
                business_id: profile.business_id,
                branch_id: profile.business_id, // Assuming single branch for now
                status: 'open',
                start_time: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            toast.error('Failed to starts shift');
            console.error(error);
        } else {
            setCurrentShift(data);
            toast.success('Shift Started');
        }
    };

    const endShift = async (reconciliationData: {
        expected_cash: number;
        counted_cash: number;
        expected_pos: number;
        pos_machine_total: number;
        expected_transfer: number;
        transfer_total: number;
    }) => {
        if (!currentShift) return;

        const variance = (reconciliationData.counted_cash - reconciliationData.expected_cash) +
            (reconciliationData.pos_machine_total - reconciliationData.expected_pos) +
            (reconciliationData.transfer_total - reconciliationData.expected_transfer);

        // 1. Insert Reconciliation
        const { error: recError } = await supabase
            .from('shift_reconciliations')
            .insert({
                shift_id: currentShift.id,
                staff_id: currentShift.staff_id,
                business_id: currentShift.business_id,
                ...reconciliationData,
                variance,
                manager_approved: variance === 0 // Auto-approve if zero variance? Or require manager always? Prompt says "If variance != 0 -> require manager approval". Assuming == 0 is ok.
            });

        if (recError) {
            toast.error('Reconciliation failed');
            console.error(recError);
            return;
        }

        // 2. Close Shift
        if (variance !== 0) {
            toast.error('Variance detected. Manager approval required to close shift completely.');
            // We might update shift status to 'pending_approval' if we had that status.
            // For now, prompt says "Prevent shift closure until reconciliation recorded".
            // It also says "Shift cannot close without reconciliation".
            // Implementation: We recorded reconciliation. 
            // If strict: Do not close shift status yet?
            // "Prevent shift closure until reconciliation recorded". OK it is recorded.
            // "If variance != 0 -> require manager approval". This implies the *process* halts.
            // I'll leave shift open if variance != 0.
            return;
        }

        const { error: closeError } = await supabase
            .from('shifts')
            .update({
                status: 'closed',
                end_time: new Date().toISOString()
            })
            .eq('id', currentShift.id);

        if (closeError) {
            toast.error('Failed to close shift');
        } else {
            setCurrentShift(null);
            toast.success('Shift Closed Successfully');
        }
    };

    return {
        currentShift,
        loading,
        startShift,
        endShift
    };
}
