const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Sends raw ESC/POS feed+cut bytes to an Xprinter XP-80T (or any ESC/POS printer)
 * using Windows "copy /b" raw print — no extra packages needed.
 *
 * ESC d n  = feed n lines (~3.75mm per line at 8 dots/mm)
 * GS V 66 0 = partial cut
 *
 * XP-80T cutter is ~30mm above print head, so we feed 10 lines (~37.5mm) to clear it.
 */
function sendEscPosFeedAndCut(printerName, feedLines = 10) {
    return new Promise((resolve) => {
        if (!printerName) { resolve(); return; }

        const ESC = 0x1B;
        const GS  = 0x1D;
        const buf = Buffer.from([
            ESC, 0x64, feedLines,   // ESC d n — feed n lines
            GS,  0x56, 0x42, 0x00,  // GS V 66 0 — partial cut
        ]);

        const tmpFile = path.join(os.tmpdir(), `xp80_feed_${Date.now()}.bin`);
        fs.writeFile(tmpFile, buf, (writeErr) => {
            if (writeErr) { console.error('[rawPrint] write error:', writeErr); resolve(); return; }

            // Windows raw print via "copy /b tmpfile \\.\printerName"
            const printerPath = `"\\\\.\\${printerName}"`;
            const cmd = `copy /b "${tmpFile}" ${printerPath}`;
            execFile('cmd.exe', ['/c', cmd], { windowsHide: true }, (err, stdout, stderr) => {
                fs.unlink(tmpFile, () => {});
                if (err) console.error('[rawPrint] feed/cut error:', err.message);
                else console.log('[rawPrint] feed+cut sent to', printerName);
                resolve(); // always resolve — don't fail the print job over this
            });
        });
    });
}

module.exports = { sendEscPosFeedAndCut };
