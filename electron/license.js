const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ── SECRET: change this to your own private string, keep it safe ──
const HMAC_SECRET = 'DreamLabsITSolutions@2025#HotelPOS$License';

const TRIAL_DAYS = 14;
const LICENSE_FILE = 'dl_license.dat';

function getLicensePath() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

// Get Windows Machine GUID from registry
function getMachineGUID() {
  try {
    const out = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: 'utf8', windowsHide: true }
    );
    const match = out.match(/MachineGuid\s+REG_SZ\s+([^\s]+)/i);
    return match ? match[1].trim() : 'UNKNOWN-GUID';
  } catch {
    return 'UNKNOWN-GUID';
  }
}

// Get CPU ID
function getCPUID() {
  try {
    const out = execSync(
      'wmic cpu get ProcessorId /value',
      { encoding: 'utf8', windowsHide: true }
    );
    const match = out.match(/ProcessorId=([^\r\n]+)/i);
    return match ? match[1].trim() : 'UNKNOWN-CPU';
  } catch {
    return 'UNKNOWN-CPU';
  }
}

// Generate a short, readable Machine ID shown to the user
function getMachineId() {
  const guid = getMachineGUID();
  const cpu  = getCPUID();
  const raw  = `${guid}::${cpu}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  // Format as DL-XXXX-XXXX-XXXX
  return `DL-${hash.slice(0,4)}-${hash.slice(4,8)}-${hash.slice(8,12)}`;
}

// Generate license key from Machine ID (run this on YOUR machine with the keygen tool)
function generateLicenseKey(machineId) {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET)
    .update(machineId)
    .digest('hex')
    .toUpperCase();
  // Format as HOTEL-XXXX-XXXX-XXXX-XXXX
  return `HOTEL-${hmac.slice(0,4)}-${hmac.slice(4,8)}-${hmac.slice(8,12)}-${hmac.slice(12,16)}`;
}

// Verify a license key against this machine's ID
function verifyLicenseKey(licenseKey) {
  const machineId = getMachineId();
  const expected  = generateLicenseKey(machineId);
  return licenseKey.trim().toUpperCase() === expected;
}

// Read stored license data
function readLicenseFile() {
  try {
    const data = fs.readFileSync(getLicensePath(), 'utf8');
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// Write license data
function writeLicenseFile(data) {
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
  fs.writeFileSync(getLicensePath(), encoded, 'utf8');
}

// Check license status — returns { status, daysLeft, machineId }
function checkLicense() {
  const machineId = getMachineId();
  const stored    = readLicenseFile();

  // Already activated
  if (stored?.activated && stored?.key) {
    if (verifyLicenseKey(stored.key)) {
      return { status: 'activated', machineId };
    }
    // Key doesn't match this machine (tampered / moved machine)
    return { status: 'invalid', machineId };
  }

  // First run — create trial record
  if (!stored?.trialStart) {
    writeLicenseFile({ trialStart: Date.now(), activated: false });
    return { status: 'trial', daysLeft: TRIAL_DAYS, machineId };
  }

  // Existing trial — check expiry
  const elapsed  = Date.now() - stored.trialStart;
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor(elapsed / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) {
    return { status: 'expired', daysLeft: 0, machineId };
  }

  return { status: 'trial', daysLeft, machineId };
}

// Activate with a license key
function activateLicense(licenseKey) {
  if (!verifyLicenseKey(licenseKey)) {
    return { success: false, error: 'Invalid license key for this machine' };
  }
  const stored = readLicenseFile() || {};
  writeLicenseFile({ ...stored, activated: true, key: licenseKey.trim().toUpperCase(), activatedAt: Date.now() });
  return { success: true };
}

module.exports = { getMachineId, generateLicenseKey, checkLicense, activateLicense };
