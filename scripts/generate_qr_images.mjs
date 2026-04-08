import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const locations = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'VIP1', 'VIP2', 'R101', 'R102', 'R103'];
const baseUrl = 'https://fobbsapartment.vercel.app/l/fobbs/restaurant/';
const outputDir = path.resolve('public/qr');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generateQRCodes() {
    for (const loc of locations) {
        const url = `${baseUrl}${loc}?src=qr`;
        const filePath = path.join(outputDir, `${loc}.png`);
        await QRCode.toFile(filePath, url);
        console.log(`✅ Generated QR for ${loc} -> ${filePath}`);
    }
}

generateQRCodes().catch(console.error);
