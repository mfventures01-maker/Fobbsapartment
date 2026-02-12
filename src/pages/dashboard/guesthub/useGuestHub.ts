import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import {
    getWhatsAppTargetNumber, openWhatsApp, openTelegram
} from '@/lib/channelRouting';
import { HOTEL_CONFIG } from '@/config/cars.config';
import toast from 'react-hot-toast';

export const useGuestHubRequest = () => {
    const { user } = useAuth();
    // navigate and profile removed as unused

    const sendRequest = async (
        _type: 'CLEANING_REQUEST' | 'RESTAURANT_ORDER' | 'BAR_ORDER' | 'RESERVATION_REQUEST', // specific type unused in logic, but good for docs
        title: string,
        messageBuilder: (payload: any) => string,
        payload: any,
        channel: 'whatsapp' | 'telegram',
        routingKey: 'frontdesk' | 'kitchen' | 'manager' = 'frontdesk'
    ) => {
        if (!user) {
            toast.error('You must be logged in.');
            return;
        }

        const requestId = Math.random().toString(36).substring(7).toUpperCase();
        const fullPayload = {
            ...payload,
            request_id: requestId,
            room_number: "Not Assigned", // Ideally fetched from profile if linked to a booking
        };

        const message = messageBuilder(fullPayload);
        const notificationMessage = `${title}: ${payload.summary || 'See details'}`;

        // 1. Create Notification (Best Effort)
        try {
            if (supabase) {
                const { error } = await supabase.from('user_notifications').insert([
                    {
                        user_id: user.id,
                        title: title,
                        message: notificationMessage,
                        read_at: null // Unread
                        // metadata: fullPayload // If column exists, strictly user_notifications usually just has title/message/created_at
                    }
                ]);

                if (error) {
                    console.warn('Notification insert failed:', error);
                    toast.success('Request prepared (notification failed)');
                } else {
                    toast.success('Request sent to your dashboard history');
                }
            }
        } catch (err) {
            console.error('Notification error:', err);
        }

        // 2. Open Channel
        if (channel === 'whatsapp') {
            openWhatsApp(getWhatsAppTargetNumber(routingKey), message);
        } else if (channel === 'telegram' && HOTEL_CONFIG.channels.telegram_handle) {
            openTelegram(HOTEL_CONFIG.channels.telegram_handle, message);
        }
    };

    return { sendRequest };
};
