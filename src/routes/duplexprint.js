const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createSession, getSession, endSession } = require('../services/sessionManager');
const { splitForDuplex, analyzePdf } = require('../services/docAnalyzer');
const { printPdf } = require('../services/printerService');

// Ensure temp uploads directory exists
const uploadsTempDir = path.join(__dirname, '../../uploads_temp');
if (!fs.existsSync(uploadsTempDir)) {
  fs.mkdirSync(uploadsTempDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const sessId = req.query.sessionId || req.body?.sessionId || req.params?.sessionId;
      const session = getSession(sessId);
      if (session && session.inputDir) {
        cb(null, session.inputDir);
      } else {
        cb(null, uploadsTempDir);
      }
    },
    filename: (req, file, cb) => {
      const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, 'upload_' + Date.now() + '_' + cleanName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

/**
 * POST /api/duplexprint/session - Create session
 */
router.post('/session', (req, res) => {
  const session = createSession('duplexprint');
  res.json({ success: true, sessionId: session.id });
});

/**
 * POST /api/duplexprint/upload - Upload PDF for duplex printing
 */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('[DuplexPrint] Multer upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // Check or create session
      const reqSessionId = req.query.sessionId || req.body?.sessionId;
      let session = getSession(reqSessionId);
      if (!session) {
        console.log('[DuplexPrint] No valid session provided, creating new duplexprint session');
        session = createSession('duplexprint');
      }

      // Ensure file is inside session.inputDir
      let targetPath = req.file.path;
      if (path.dirname(targetPath) !== session.inputDir) {
        const destPath = path.join(session.inputDir, path.basename(req.file.path));
        fs.renameSync(req.file.path, destPath);
        targetPath = destPath;
      }

      console.log(`[DuplexPrint] Processing upload: ${req.file.originalname} (${req.file.size} bytes) in session: ${session.id}`);

      // Analyze the PDF
      const analysis = await analyzePdf(targetPath);
      
      const orientation = req.body?.orientation || (analysis.pages[0]?.orientation || 'portrait');
      const flipEdge = req.body?.flipEdge || (orientation === 'landscape' ? 'short-edge' : 'long-edge');

      // Split for duplex (with normal even page order: 2, 4...)
      const duplex = await splitForDuplex(targetPath, session.outputDir, {
        orientation,
        flipEdge,
        evenOrder: 'normal',
      });

      console.log(`[DuplexPrint] PDF split complete: ${duplex.oddPageCount} odd pages, ${duplex.evenPageCount} even pages`);

      res.json({
        success: true,
        sessionId: session.id,
        originalFile: req.file.originalname,
        analysis,
        duplex: {
          ...duplex,
          oddUrl: `/api/duplexprint/output/${session.id}/odd_pages.pdf`,
          evenUrl: `/api/duplexprint/output/${session.id}/even_pages.pdf`,
        },
      });
    } catch (error) {
      console.error('[DuplexPrint] Upload/process error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * POST /api/duplexprint/print - Print odd or even pages
 */
router.post('/print', async (req, res) => {
  try {
    const { sessionId, pageSet, mode = 'bw', orientation = 'portrait' } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const filename = pageSet === 'odd' ? 'odd_pages.pdf' : 'even_pages.pdf';
    const filePath = path.join(session.outputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `${filename} not found. Upload and process a PDF first.` });
    }

    const result = await printPdf(filePath, {
      colorMode: mode === 'color' ? 'color' : 'grayscale',
      orientation,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[DuplexPrint] Print error:', error);
    res.status(500).json({ error: error.message });
  }
});

const { generateTestPdf } = require('../../scripts/generate_duplex_test_pdf');

/**
 * POST /api/duplexprint/sample-test - Generate and load 4-page duplex test document
 */
router.post('/sample-test', async (req, res) => {
  try {
    let session = getSession(req.body.sessionId);
    if (!session) {
      session = createSession('duplexprint');
    }

    const orientation = req.body.orientation || 'portrait';
    const flipEdge = req.body.flipEdge || (orientation === 'landscape' ? 'short-edge' : 'long-edge');
    const pageCount = parseInt(req.body.pageCount, 10) || 4;

    const filename = `duplex_test_${pageCount}pages.pdf`;
    const testPdfPath = path.join(session.inputDir, filename);
    await generateTestPdf(testPdfPath, { orientation, flipEdge, pageCount });

    // Analyze the PDF
    const analysis = await analyzePdf(testPdfPath);

    // Split for duplex (with normal even page order: 2, 4...)
    const duplex = await splitForDuplex(testPdfPath, session.outputDir, {
      orientation,
      flipEdge,
      evenOrder: 'normal',
    });

    res.json({
      success: true,
      sessionId: session.id,
      originalFile: filename,
      analysis,
      duplex: {
        ...duplex,
        oddUrl: `/api/duplexprint/output/${session.id}/odd_pages.pdf`,
        evenUrl: `/api/duplexprint/output/${session.id}/even_pages.pdf`,
        masterUrl: `/api/duplexprint/input/${session.id}/${filename}`,
      },
    });
  } catch (error) {
    console.error('[DuplexPrint] Sample test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/duplexprint/from-session - Load a PDF from another session (e.g. TxtToDoc)
 */
router.post('/from-session', async (req, res) => {
  try {
    const { sourceSessionId, filename = 'text_document.pdf', orientation = 'portrait', flipEdge = 'long-edge' } = req.body;
    const sourceSession = getSession(sourceSessionId);
    if (!sourceSession) {
      return res.status(404).json({ error: 'Source session not found' });
    }

    let srcPath = path.join(sourceSession.outputDir, filename);
    if (!fs.existsSync(srcPath)) {
      srcPath = path.join(sourceSession.inputDir, filename);
    }
    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ error: 'File not found in source session' });
    }

    const session = createSession('duplexprint');
    const targetPath = path.join(session.inputDir, filename);
    fs.copyFileSync(srcPath, targetPath);

    const analysis = await analyzePdf(targetPath);
    const duplex = await splitForDuplex(targetPath, session.outputDir, {
      orientation,
      flipEdge,
      evenOrder: 'normal',
    });

    res.json({
      success: true,
      sessionId: session.id,
      originalFile: filename,
      analysis,
      duplex: {
        ...duplex,
        oddUrl: `/api/duplexprint/output/${session.id}/odd_pages.pdf`,
        evenUrl: `/api/duplexprint/output/${session.id}/even_pages.pdf`,
        masterUrl: `/api/duplexprint/input/${session.id}/${filename}`,
      },
    });
  } catch (error) {
    console.error('[DuplexPrint] From session error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/duplexprint/input/:sessionId/:filename
 */
router.get('/input/:sessionId/:filename', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).send('Not found');

  const filePath = path.join(session.inputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * GET /api/duplexprint/output/:sessionId/:filename
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
 * POST /api/duplexprint/end - End session
 */
router.post('/end', (req, res) => {
  const { sessionId } = req.body;
  endSession(sessionId);
  res.json({ success: true });
});

module.exports = router;

