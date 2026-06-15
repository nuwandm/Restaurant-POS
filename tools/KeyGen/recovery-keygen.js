/**
 * DreamLabs IT Solutions — Admin PIN Recovery Code Generator
 * Completely separate from the license keygen — different secret, different purpose.
 *
 * Usage:
 *   node tools/KeyGen/recovery-keygen.js <MACHINE-ID>
 *
 * The generated code is valid ONLY for that machine on TODAY's date (UTC).
 * A new code must be generated each day if the customer hasn't used it yet.
 */
const crypto = require('crypto');

// !! KEEP THIS SECRET SEPARATE FROM THE LICENSE SECRET !!
const RECOVERY_SECRET = 'DreamLabsITSolutions@2025#HotelPOS$AdminPINRecovery!9x';

function generateRecoveryCode(machineId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const payload = `${machineId.trim().toUpperCase()}|${today}`;
  const hmac = crypto.createHmac('sha256', RECOVERY_SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase();
  // 16 hex chars formatted as XXXX-XXXX-XXXX-XXXX
  return `${hmac.slice(0,4)}-${hmac.slice(4,8)}-${hmac.slice(8,12)}-${hmac.slice(12,16)}`;
}

const machineId = process.argv[2];
if (!machineId) {
  console.log('Usage: node tools/KeyGen/recovery-keygen.js <MACHINE-ID>');
  console.log('Example: node tools/KeyGen/recovery-keygen.js DL-A3F7-B291-CC04');
  process.exit(1);
}

const code = generateRecoveryCode(machineId);
const today = new Date().toISOString().slice(0, 10);

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  DreamLabs IT Solutions — Admin PIN Recovery');
console.log('═══════════════════════════════════════════════════');
console.log('  Machine ID    :', machineId.trim().toUpperCase());
console.log('  Valid for date:', today, '(UTC) — expires at midnight');
console.log('  Recovery Code :', code);
console.log('═══════════════════════════════════════════════════');
console.log('  WARNING: This code resets ALL admin PINs to 0000');
console.log('  The admin will be forced to set a new PIN.');
console.log('═══════════════════════════════════════════════════');
console.log('');
