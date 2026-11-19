const express = require('express');
const router = express.Router();
const { getAvailablePrinters, getPrinterStatus, findCanonPrinter, printPdf } = require('../services/printerService');
const { getSession } = require('../services/sessionManager');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/printer/status - Get printer status
 */
router.get('/status', (req, res) => {
  const status = getPrinterStatus();
  const printers = getAvailablePrinters();
  const canon = findCanonPrinter();
  
  res.json({
    canon: canon ? { name: canon.name, found: true, status: canon.status, ip: canon.ip || '192.168.0.111' } : { found: false },
    allPrinters: printers,
    defaultStatus: status,
  });
});

/**
 * GET /api/printer/list - List all printers
 */
router.get('/list', (req, res) => {
  const printers = getAvailablePrinters();
  res.json({ printers });
});

/**
 * POST /api/printer/print - Generic print endpoint
 */
router.post('/print', async (req, res) => {
  try {
    const { sessionId, filename, system, mode = 'bw', quality = 'normal', copies = 1, inkSaveLevel = 'medium' } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Look for file in output dir first, then input dir
    let filePath = path.join(session.outputDir, filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(session.inputDir, filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = await printPdf(filePath, {
      colorMode: mode === 'color' ? 'color' : 'grayscale',
      quality: (inkSaveLevel === 'high' || inkSaveLevel === 'maximum') ? 'draft' : quality,
      copies: parseInt(copies) || 1,
      inkSaveLevel,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Printer] Print error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
