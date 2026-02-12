
/**
 * Generates a unique booking ID in the format: {BUSINESS}-{YYYYMMDD}-{RANDOM4}
 * Example: FOBBS-20260123-8F3K
 */
export function generateBookingId(businessShortCode?: string): string {
    const prefix = businessShortCode ? businessShortCode.toUpperCase().replace(/[^A-Z]/g, '') : 'RES';
    return generateId(prefix);
}

/**
 * Generates a unique request ID in the format: {BUSINESS}-{TYPE}-{YYYYMMDD}-{RANDOM4}
 * Example: FOBBS-RS-20260123-8F3K
 */
export function generateRequestId(
    type: "RS" | "HK" | "IS" | "AD",
    businessShortCode?: string
): string {
    const prefix = businessShortCode ? businessShortCode.toUpperCase().replace(/[^A-Z]/g, '') : 'RES';
    return generateId(`${prefix}-${type}`);
}

function generateId(prefix: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let random4 = '';
    for (let i = 0; i < 4; i++) {
        random4 += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${dateStr}-${random4}`;
}
