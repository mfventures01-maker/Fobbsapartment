import { supabase } from '../lib/supabaseClient';

export interface PresenceRegistration {
    staff_id: string;
    business_id: string;
    branch_id: string;
    terminal_type: 'staff_terminal' | 'manager_terminal' | 'ceo_terminal';
}

/**
 * PresenceService - Anti-Gravity Realtime Upgrade
 * Handles terminal registration and heartbeat maintenance.
 */
export const presenceService = {
    /**
     * Registers a new terminal session or updates an existing one.
     */
    async registerPresence(params: PresenceRegistration) {
        console.log('[PRESENCE] Registering terminal session...', params.terminal_type);

        const { error } = await supabase
            .from('terminal_sessions')
            .upsert({
                staff_id: params.staff_id,
                business_id: params.business_id,
                branch_id: params.branch_id,
                terminal_type: params.terminal_type,
                status: 'active',
                last_seen: new Date().toISOString()
            }, {
                onConflict: 'staff_id,terminal_type'
            });

        if (error) {
            console.error('[PRESENCE] Registration failed:', error);
            return { error };
        }
        return { error: null };
    },

    /**
     * Updates the last_seen timestamp for the current session.
     */
    async sendHeartbeat(staffId: string, terminalType: string) {
        const { error } = await supabase
            .from('terminal_sessions')
            .update({ last_seen: new Date().toISOString(), status: 'active' })
            .match({ staff_id: staffId, terminal_type: terminalType });

        if (error) {
            console.error('[PRESENCE] Heartbeat failed:', error);
            return { error };
        }
        return { error: null };
    },

    /**
     * Marks the session as offline on logout.
     */
    async disconnect(staffId: string, terminalType: string) {
        console.log('[PRESENCE] Disconnecting session...');
        await supabase
            .from('terminal_sessions')
            .update({ status: 'offline' })
            .match({ staff_id: staffId, terminal_type: terminalType });
    }
};
