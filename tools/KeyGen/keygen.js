/**
 * DreamLabs IT Solutions — Hotel POS License Key Generator
 * Run: node tools/keygen.js DL-XXXX-XXXX-XXXX
 */
const crypto = require('crypto');

const HMAC_SECRET = 'DreamLabsITSolutions@2025#HotelPOS$License';

function generateLicenseKey(machineId) {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET)
    .update(machineId.trim().toUpperCase())
    .digest('hex')
    .toUpperCase();
  return `HOTEL-${hmac.slice(0,4)}-${hmac.slice(4,8)}-${hmac.slice(8,12)}-${hmac.slice(12,16)}`;
}

const machineId = process.argv[2];
if (!machineId) {
  console.log('Usage: node tools/keygen.js <MACHINE-ID>');
  console.log('Example: node tools/keygen.js DL-A3F7-B291-CC04');
  process.exit(1);
}

const key = generateLicenseKey(machineId);
console.log('');
console.log('═══════════════════════════════════════════');
console.log('  DreamLabs IT Solutions — Hotel POS');
console.log('═══════════════════════════════════════════');
console.log('  Machine ID :', machineId.trim().toUpperCase());
console.log('  License Key:', key);
console.log('═══════════════════════════════════════════');
console.log('');
