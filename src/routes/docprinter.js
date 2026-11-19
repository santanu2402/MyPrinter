const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createSession, getSession, endSession } = require('../services/sessionManager');
const { analyzePdf } = require('../services/docAnalyzer');
const { optimizePdfForPrint } = require('../services/pdfGenerator');
const { printPdf } = require('../services/printerService');

// Ensure temp uploads directory exists
const uploadsTempDir = path.join(__dirname, '../../uploads_temp');
if (!fs.existsSync(uploadsTempDir)) {
  fs.mkdirSync(uploadsTempDir, { recursive: true });
}

// Configure multer — always upload to temp dir first, then move into session
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsTempDir);
    },
    filename: (req, file, cb) => {
      const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, 'document_' + Date.now() + '_' + cleanName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

/**
 * POST /api/docprinter/session - Create session
 */
router.post('/session', (req, res) => {
  const session = createSession('docprinter');
  res.json({ success: true, sessionId: session.id });
});

/**
 * POST /api/docprinter/upload - Upload and analyze document
 */
router.post('/upload', (req, res) => {
  const uploadHandler = upload.single('file');
  
  uploadHandler(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const session = getSession(req.body.sessionId);
      if (!session) {
        // Clean up temp file
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ error: 'Session not found' });
      }

      // Move file from temp dir into session's inputDir
      let targetPath = req.file.path;
      if (path.dirname(targetPath) !== session.inputDir) {
        const destPath = path.join(session.inputDir, path.basename(req.file.path));
        fs.renameSync(req.file.path, destPath);
        targetPath = destPath;
        req.file.path = destPath;
      }

      // Analyze the document
      let analysis = null;
      if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
        analysis = await analyzePdf(targetPath);
      } else {
        analysis = {
          pageCount: 'unknown',
          fileSize: req.file.size,
          recommendation: {
            suggestedMode: 'bw',
            suggestions: ['Non-PDF document detected. Convert to PDF for best optimization.'],
            estimatedInkSaving: '10-20%',
          },
        };
      }

      res.json({
        success: true,
        file: {
          name: req.file.originalname,
          size: req.file.size,
          path: targetPath,
          filename: path.basename(targetPath),
        },
        analysis,
      });
    } catch (error) {
      console.error('[DocPrinter] Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * POST /api/docprinter/optimize - Optimize document for printing
 */
router.post('/optimize', async (req, res) => {
  try {
    const { sessionId, filename, mode = 'bw' } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const inputPath = path.join(session.inputDir, filename);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const outputFilename = `optimized_${filename}`;
    const outputPath = path.join(session.outputDir, outputFilename);

    const result = await optimizePdfForPrint(inputPath, outputPath, { mode });

    res.json({
      success: true,
      ...result,
      outputUrl: `/api/docprinter/output/${sessionId}/${outputFilename}`,
    });
  } catch (error) {
    console.error('[DocPrinter] Optimize error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/docprinter/print - Print the document
 */
router.post('/print', async (req, res) => {
  try {
    const { sessionId, filename, mode = 'bw', quality = 'normal' } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Try optimized version first; if not yet optimized, optimize to A4 automatically
    let filePath = path.join(session.outputDir, `optimized_${filename}`);
    if (!fs.existsSync(filePath)) {
      const inputPath = path.join(session.inputDir, filename);
      if (fs.existsSync(inputPath)) {
        await optimizePdfForPrint(inputPath, filePath, { mode });
      } else {
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    const result = await printPdf(filePath, {
      colorMode: mode === 'color' ? 'color' : 'grayscale',
      quality,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[DocPrinter] Print error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/docprinter/output/:sessionId/:filename
 */
router.get('/output/:sessionId/:filename', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).send('Not found');
  
  const filePath = path.join(session.outputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * POST /api/docprinter/end - End session
 */
router.post('/end', (req, res) => {
  const { sessionId } = req.body;
  endSession(sessionId);
  res.json({ success: true });
});

module.exports = router;
