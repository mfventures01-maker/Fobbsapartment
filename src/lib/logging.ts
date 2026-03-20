import { HOTEL_CONFIG } from '@/config/cars.config';
import { callRPC } from './rpcClient';

export interface LogPayload {
    customer_name: string;
    customer_phone: string;
    item_name: string;
    total_value: number;
    booking_id?: string;
    business_type?: string;
    metadata?: any;
}

export async function logLeadOrBooking(payload: LogPayload) {
    const logData = {
        business_id: HOTEL_CONFIG.business_id,
        business_name: HOTEL_CONFIG.business_name,
        business_type: payload.business_type || HOTEL_CONFIG.business_type,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        order_details: {
            booking_id: payload.booking_id,
            item: payload.item_name,
            ...payload.metadata
        },
        total: payload.total_value,
        status: 'pending_whatsapp',
        created_at: new Date().toISOString()
    };

    try {
        await callRPC('public', 'log_guest_event', { p_payload: logData });
        console.log("Logged via RPC successfully.");
    } catch (err) {
        console.error("RPC Log Exception:", err);
        fallbackLog(logData);
    }
}

function fallbackLog(data: any) {
    console.log("RPC failure. Local Logging:", data);
    try {
        const key = 'carss_bookings_log';
        const logs = JSON.parse(localStorage.getItem(key) || '[]');
        logs.push(data);
        if (logs.length > 200) {
            logs.splice(0, logs.length - 200);
        }
        localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
        console.error("LocalStorage write failed", e);
    }
}

export interface GuestHubLogPayload {
    type: "room_service" | "housekeeping" | "issue" | "addon";
    request_id: string;
    room_number: string;
    routing_target: string;
    channel: string;
    subtotal?: number;
    details: any;
    notes?: string;
}

export async function logGuestHubEvent(payload: GuestHubLogPayload) {
    const logData = {
        business_id: HOTEL_CONFIG.business_id,
        business_name: HOTEL_CONFIG.business_name,
        business_type: HOTEL_CONFIG.business_type,
        customer_name: `Guest Room ${payload.room_number}`,
        customer_phone: "N/A", // In-house
        order_details: {
            type: payload.type,
            request_id: payload.request_id,
            room: payload.room_number,
            target: payload.routing_target,
            channel: payload.channel,
            items: payload.details,
            notes: payload.notes
        },
        total: payload.subtotal || 0,
        status: `pending_${payload.channel}`,
        created_at: new Date().toISOString()
    };

    try {
        await callRPC('public', 'log_guest_event', { p_payload: logData });
        console.log("Logged GuestHub event via RPC successfully.");
    } catch (err) {
        console.error("RPC GuestHub Log Exception:", err);
        fallbackGuestHubLog(logData);
    }
}

function fallbackGuestHubLog(data: any) {
    console.log("Local Logging GuestHub:", data);
    try {
        const key = 'carss_guesthub_log';
        const logs = JSON.parse(localStorage.getItem(key) || '[]');
        logs.push(data);
        if (logs.length > 200) {
            logs.splice(0, logs.length - 200);
        }
        localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
        console.error("LocalStorage write failed", e);
    }
}
