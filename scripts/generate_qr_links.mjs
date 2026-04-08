import fs from 'fs';
import path from 'path';

// Define the locations (tables / rooms)
const locations = [
    { id: 'T1', department: 'bar', branch: 'fobbs' },
    { id: 'T2', department: 'bar', branch: 'fobbs' },
    { id: 'T3', department: 'bar', branch: 'fobbs' },
    { id: 'T4', department: 'bar', branch: 'fobbs' },
    { id: 'T5', department: 'bar', branch: 'fobbs' },
    { id: 'T6', department: 'bar', branch: 'fobbs' },
    { id: 'T7', department: 'bar', branch: 'fobbs' },
    { id: 'VIP1', department: 'lounge', branch: 'fobbs' },
    { id: 'VIP2', department: 'lounge', branch: 'fobbs' },
    { id: 'R101', department: 'hotel', branch: 'fobbs' },
    { id: 'R102', department: 'hotel', branch: 'fobbs' },
    { id: 'R103', department: 'hotel', branch: 'fobbs' },
];

const BASE_URL = 'https://fobbs.carss.ng';

const csvRows = ['locationId,department,branch,link,qr_code_file'];

for (const loc of locations) {
    // e.g. https://fobbs.carss.ng/l/fobbs/bar/T1?src=qr&campaign=launch
    const link = `${BASE_URL}/l/${loc.branch}/${loc.department}/${loc.id}?src=qr&campaign=launch`;
    const qrFile = `${loc.id}.png`;
    csvRows.push(`${loc.id},${loc.department},${loc.branch},${link},${qrFile}`);
}

const csvData = csvRows.join('\n');
fs.writeFileSync('qr_tracking_links.csv', csvData);
console.log('✅ Generated qr_tracking_links.csv for bulk QR generation!');
