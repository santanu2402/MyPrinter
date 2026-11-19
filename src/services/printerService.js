const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const printerConfig = require('../../config/printer');

/**
 * Printer Service
 * Connects to Canon G3770 via CUPS / IPP over WiFi
 */

/**
 * Get list of available printers via CUPS
 */
function getAvailablePrinters() {
  try {
    const output = execSync('lpstat -p 2>/dev/null || echo ""', { encoding: 'utf-8' });
    const printers = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^printer\s+(\S+)\s+/);
      if (match) {
        const name = match[1];
        const isCanon = name.toLowerCase().includes('canon') || name.toLowerCase().includes('g37');
        printers.push({
          name,
          isCanon,
          status: line.includes('idle') ? 'idle' : line.includes('printing') ? 'printing' : 'ready',
        });
      }
    }

    return printers;
  } catch (error) {
    console.error('[Printer] Error getting printers:', error.message);
    return [];
  }
}

/**
 * Get the default printer name
 */
function getDefaultPrinter() {
  try {
    const output = execSync('lpstat -d 2>/dev/null || echo ""', { encoding: 'utf-8' });
    const match = output.match(/system default destination:\s*(\S+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Find the Canon G3770 printer
 */
function findCanonPrinter() {
  const printers = getAvailablePrinters();

  // 1. Look for Canon_G3770
  let canon = printers.find(p => p.name.toLowerCase().includes('g3770') || p.name.toLowerCase().includes('g3700') || p.name.toLowerCase().includes('g3070'));

  // 2. Look for any Canon printer
  if (!canon) {
    canon = printers.find(p => p.isCanon);
  }

  // 3. Fall back to configured name
  if (!canon && printerConfig.lpName) {
    canon = { name: printerConfig.lpName, isCanon: true, status: 'ready', ip: printerConfig.ip };
  } else if (canon) {
    canon.ip = printerConfig.ip;
  }

  return canon;
}

/**
 * Print a PDF file using the macOS lp command
 */
async function printPdf(filePath, options = {}) {
  const {
    printerName = null,
    copies = 1,
    colorMode = 'color',  // 'color' or 'grayscale'
    quality = 'normal',   // 'draft', 'normal', 'high'
    mediaSize = 'A4',
    orientation = 'portrait',
    pageRanges = null,     // e.g., '1-3,5'
  } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Find the printer
  let printer = printerName;
  if (!printer) {
    const canon = findCanonPrinter();
    if (canon) {
      printer = canon.name;
    } else {
      printer = getDefaultPrinter();
    }
  }

  if (!printer) {
    printer = printerConfig.lpName || 'Canon_G3770';
  }

  // Build lp command with Canon-specific supported PPD options
  const args = ['-d', printer];

  if (copies > 1) {
    args.push('-n', copies.toString());
  }

  const lpOptions = [];
  lpOptions.push(`PageSize=${mediaSize}`);
  lpOptions.push('fit-to-page');  // Scale any content to fit within A4

  // Canon G3070/G3770 uses ColorModel=RGB and ColorModel=Gray
  if (colorMode === 'grayscale' || colorMode === 'bw') {
    lpOptions.push('ColorModel=Gray');
  } else {
    lpOptions.push('ColorModel=RGB');
  }

  // Hardware-level ink saving for Canon G3770
  let effectiveQuality = quality;
  if (options.inkSaveLevel === 'high' || options.inkSaveLevel === 'maximum') {
    effectiveQuality = 'draft';
  }
  const qualityMap = { draft: 'Draft', normal: 'Normal', high: 'High', maximum: 'Draft' };
  lpOptions.push(`cupsPrintQuality=${qualityMap[effectiveQuality] || 'Normal'}`);
  lpOptions.push('MediaType=Stationery');

  if (orientation === 'landscape') {
    lpOptions.push('orientation-requested=4');
  }

  if (pageRanges) {
    args.push('-P', pageRanges);
  }

  for (const opt of lpOptions) {
    args.push('-o', opt);
  }

  args.push(filePath);

  const cmd = `lp ${args.map(a => `'${a}'`).join(' ')}`;
  console.log(`[Printer] Executing command: ${cmd}`);

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Printer] Print error:`, error.message, stderr);
        reject(new Error(`Print failed: ${error.message}`));
      } else {
        const jobMatch = stdout.match(/request id is (\S+)/);
        const jobId = jobMatch ? jobMatch[1] : 'unknown';
        console.log(`[Printer] Print job submitted successfully: ${jobId}`);
        resolve({
          success: true,
          jobId,
          printer,
          message: `Print job ${jobId} sent directly to ${printer} (Canon G3770 @ ${printerConfig.ip})`,
        });
      }
    });
  });
}

/**
 * Get printer status
 */
function getPrinterStatus(printerName) {
  try {
    const canon = findCanonPrinter();
    const name = printerName || canon?.name || 'Canon_G3770';

    const output = execSync(`lpstat -p '${name}' 2>/dev/null || echo "not found"`, { encoding: 'utf-8' });

    if (output.includes('idle')) {
      return { status: 'ready', message: `${name} is ready on WiFi (${printerConfig.ip})`, printer: name, ip: printerConfig.ip };
    } else if (output.includes('printing')) {
      return { status: 'busy', message: `${name} is currently printing`, printer: name, ip: printerConfig.ip };
    } else if (output.includes('disabled')) {
      return { status: 'disabled', message: `${name} is disabled`, printer: name, ip: printerConfig.ip };
    } else {
      return { status: 'ready', message: `${name} configured on WiFi (${printerConfig.ip})`, printer: name, ip: printerConfig.ip };
    }
  } catch (error) {
    return { status: 'ready', message: `Canon G3770 ready (${printerConfig.ip})`, printer: 'Canon_G3770', ip: printerConfig.ip };
  }
}

module.exports = {
  getAvailablePrinters,
  getDefaultPrinter,
  findCanonPrinter,
  printPdf,
  getPrinterStatus,
};
