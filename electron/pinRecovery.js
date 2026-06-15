/**
 * Admin PIN recovery — completely separate from license verification.
 * Uses its own secret so a recovery code can never be used as a license key.
 */
const crypto = require('crypto');

// Must match recovery-keygen.js exactly — keep private
const RECOVERY_SECRET = 'DreamLabsITSolutions@2025#HotelPOS$AdminPINRecovery!9x';

function verifyRecoveryCode(machineId, code) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const payload = `${machineId.trim().toUpperCase()}|${today}`;
  const expected = crypto.createHmac('sha256', RECOVERY_SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase();
  const expectedFormatted = `${expected.slice(0,4)}-${expected.slice(4,8)}-${expected.slice(8,12)}-${expected.slice(12,16)}`;
  return code.trim().toUpperCase() === expectedFormatted;
}

// getDb is a function () => db so we always get the current db instance
function setupPinRecovery(ipcMain, getDb, getMachineId) {
  ipcMain.handle('recovery:getMachineId', () => {
    try { return getMachineId(); } catch { return 'UNKNOWN'; }
  });

  ipcMain.handle('recovery:resetAdminPin', (_, { machineId, code }) => {
    try {
      if (!verifyRecoveryCode(machineId, code)) {
        return { success: false, error: 'Invalid or expired recovery code' };
      }
      const db = getDb();
      if (!db) return { success: false, error: 'Database not ready' };
      const info = db.db.prepare(
        "UPDATE staff SET pin='0000', pin_reset_required=1 WHERE role='admin' AND is_active=1"
      ).run();
      if (info.changes === 0) return { success: false, error: 'No admin accounts found' };
      return { success: true, count: info.changes };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupPinRecovery };
