import { Room, HOTEL_CONFIG } from '@/config/cars.config';

export interface BookingForm {
    guestName: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    notes?: string;
    bookingId?: string;
}

export function buildHotelBookingMessage(formData: BookingForm, room: Room): string {
    const nights = calculateNights(formData.checkIn, formData.checkOut);
    const totalCost = room.pricePerNight * nights;

    return `*NEW BOOKING REQUEST* 🏨
  
*${HOTEL_CONFIG.business_name}*
------------------------
*Booking ID:* ${formData.bookingId || "PENDING"}
*Room:* ${room.name} (${room.type})
*Guest:* ${formData.guestName}
*Phone:* ${formData.phone}
------------------------
*Check-in:* ${formData.checkIn}
*Check-out:* ${formData.checkOut}
*Nights:* ${nights}
*Guests:* ${formData.guests}
------------------------
*Total Estimate:* ₦${totalCost.toLocaleString()}
*Notes:* ${formData.notes || "None"}

_Sent via CARSS_`;
}

// --- GUEST HUB BUILDERS ---

export function buildRoomServiceMessage(payload: any): string {
    const itemsList = payload.items.map((i: any) => `- ${i.name} (x${i.quantity})`).join('\n');
    return `*NEW ROOM SERVICE ORDER* 🍽️
  
*${HOTEL_CONFIG.business_name}*
------------------------
*ID:* ${payload.request_id}
*Room:* ${payload.room_number}
------------------------
*Order Details:*
${itemsList}

*Subtotal:* ₦${payload.subtotal.toLocaleString()}
*Payment:* ${payload.payment_method || "Bill to Room"}
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

export function buildHousekeepingMessage(payload: any): string {
    const reqList = payload.requests.join('\n- ');
    return `*HOUSEKEEPING REQUEST* 🧹
  
*${HOTEL_CONFIG.business_name}*
------------------------
*ID:* ${payload.request_id}
*Room:* ${payload.room_number}
------------------------
*Requests:*
- ${reqList}

------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

export function buildIssueMessage(payload: any): string {
    return `*ISSUE REPORT* ⚠️
  
*${HOTEL_CONFIG.business_name}*
------------------------
*ID:* ${payload.request_id}
*Room:* ${payload.room_number}
------------------------
*Category:* ${payload.category_label}
*Description:* ${payload.notes}

_Sent via CARSS_`;
}

export function buildAddonMessage(payload: any): string {
    const itemsList = payload.items.map((i: any) => `- ${i.label}`).join('\n');
    return `*ADD-ON REQUEST* ➕
  
*${HOTEL_CONFIG.business_name}*
------------------------
*ID:* ${payload.request_id}
*Room:* ${payload.room_number}
------------------------
*Requested:*
${itemsList}

${payload.subtotal > 0 ? `*Est. Cost:* ₦${payload.subtotal.toLocaleString()}` : ''}
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}


export function buildBarOrderMessage(payload: any): string {
    const itemsList = payload.items.map((i: any) => `- ${i.name} (x${i.quantity})`).join('\n');
    return `*NEW BAR ORDER* 🍸
  
*${HOTEL_CONFIG.business_name}*
------------------------
*ID:* ${payload.request_id}
*Room:* ${payload.room_number}
------------------------
*Order Details:*
${itemsList}

*Subtotal:* ₦${payload.subtotal.toLocaleString()}
*Payment:* ${payload.payment_method || "Bill to Room"}
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

export function buildReservationMessage(payload: any): string {
    return `*NEW RESERVATION REQUEST* 📅
  
*${HOTEL_CONFIG.business_name}*
------------------------
*Type:* ${payload.type}
*Guest:* ${payload.guest_name}
------------------------
*Date:* ${payload.date}
*Time:* ${payload.time}
*Size:* ${payload.guests} People
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

// --- ROUTING UTILS ---

export function buildTransportMessage(payload: any): string {
    return `*TRANSPORT REQUEST* 🚗
  
*${HOTEL_CONFIG.business_name}*
------------------------
*Type:* ${payload.type || "Pickup"}
*Guest:* ${payload.guest_name}
*Phone:* ${payload.phone}
------------------------
*From:* ${payload.pickup_location}
*To:* ${payload.destination}
*Time:* ${payload.time}
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

export function buildLaundryMessage(payload: any): string {
    return `*LAUNDRY REQUEST* 🧺
  
*${HOTEL_CONFIG.business_name}*
------------------------
*Room:* ${payload.room_number}
*Guest:* ${payload.guest_name}
------------------------
*Pickup Time:* ${payload.time}
*Items:* ${payload.items_summary}
------------------------
*Notes:* ${payload.notes || "None"}

_Sent via CARSS_`;
}

export function sanitizePhoneToE164NG(phone: string): string {
    let p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '234' + p.substring(1);
    if (!p.startsWith('234')) p = '234' + p;
    return p;
}

export function getWhatsAppTargetNumber(targetKey: "frontdesk" | "kitchen" | "manager" | string): string {
    const mapping = HOTEL_CONFIG.channels.whatsapp_numbers as any;
    const num = mapping[targetKey] || mapping['frontdesk'];
    return num;
}

export function openWhatsApp(number: string, message: string) {
    const cleanNumber = sanitizePhoneToE164NG(number);
    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
    window.open(url, '_blank');
}

export function openTelegram(handleOrUrl: string, message: string) {
    // If full URL is provided (e.g. from config)
    if (handleOrUrl.startsWith('http')) {
        const separator = handleOrUrl.includes('?') ? '&' : '?';
        const url = `${handleOrUrl}${separator}text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        return;
    }

    // Otherwise treat as handle
    const handle = handleOrUrl.replace('@', '');
    const url = `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

export function calculateNights(start: string, end: string): number {
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
}
