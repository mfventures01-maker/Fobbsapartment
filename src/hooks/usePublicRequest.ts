import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import {
    getWhatsAppTargetNumber, openWhatsApp, openTelegram
} from '@/lib/channelRouting';
import { HOTEL_CONFIG } from '@/config/cars.config';
import toast from 'react-hot-toast';

export const usePublicRequest = () => {
    const { user } = useAuth();

    const sendRequest = async (
        title: string,
        messageBuilder: (payload: any) => string,
        payload: any,
        channel: 'whatsapp' | 'telegram',
        routingKey: 'frontdesk' | 'kitchen' | 'manager' = 'frontdesk'
    ) => {
        const requestId = Math.random().toString(36).substring(7).toUpperCase();
        // Use provided bookingId or generate a request ID
        const fullPayload = {
            ...payload,
            request_id: payload.request_id || requestId,
            room_number: payload.room_number || "Not Assigned",
        };

        const message = messageBuilder(fullPayload);
        const notificationMessage = `${title}: ${payload.summary || 'See details'}`;

        // 1. Create Notification (Best Effort)
        // Only attempt if user is logged in, OR if we want to try generic insert (which might fail RLS)
        // If user is logged in, we link it. If not, we skip or try generic if table allows null user_id.
        // Assuming user_notifications requires user_id, we only try if user exists.
        if (user && supabase) {
            try {
                const { error } = await supabase.from('user_notifications').insert([
                    {
                        user_id: user.id,
                        title: title,
                        message: notificationMessage,
                        read_at: null
                    }
                ]);

                if (error) {
                    console.warn('Notification insert failed:', error);
                } else {
                    // success silently
                }
            } catch (err) {
                console.error('Notification error:', err);
            }
        }

        // 2. Open Channel
        if (channel === 'whatsapp') {
            openWhatsApp(getWhatsAppTargetNumber(routingKey), message);
        } else if (channel === 'telegram' && HOTEL_CONFIG.channels.telegram_handle) {
            openTelegram(HOTEL_CONFIG.channels.telegram_handle, message);
        }

        toast.success('Request prepared & opened');
    };

    return { sendRequest };
};
