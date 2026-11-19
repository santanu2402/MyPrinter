const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createSession, getSession, endSession } = require('../services/sessionManager');
const { enhanceText, analyzeText } = require('../services/textEnhancer');
const { generateTextPdf } = require('../services/pdfGenerator');
const { splitForDuplex, analyzePdf } = require('../services/docAnalyzer');
const { printPdf } = require('../services/printerService');

/**
 * POST /api/txttodoc/session - Create a new session
 */
router.post('/session', (req, res) => {
  const session = createSession('txttodoc');
  res.json({ success: true, sessionId: session.id });
});

/**
 * POST /api/txttodoc/enhance - Enhance and analyze text
 */
router.post('/enhance', async (req, res) => {
  try {
    const { text, sessionId, preserveFormatting = false } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save original text
    fs.writeFileSync(path.join(session.inputDir, 'original.txt'), text);

    // Enhance text
    const enhanced = enhanceText(text, { preserveFormatting });
    
    // Save enhanced text
    fs.writeFileSync(path.join(session.workspaceDir, 'enhanced.txt'), enhanced.enhanced);

    res.json({
      success: true,
      enhanced: enhanced.enhanced,
      stats: enhanced.stats,
    });
  } catch (error) {
    console.error('[TxtToDoc] Enhance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/txttodoc/generate - Generate PDF from text with duplex support
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      sessionId, 
      text, 
      mode = 'bw', 
      fontSize = 11,
      orientation = 'portrait',
      flipEdge = 'long-edge',
    } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const outputPath = path.join(session.outputDir, 'text_document.pdf');
    
    await generateTextPdf(text, outputPath, {
      mode,
      fontSize,
      title: 'Text Document - MyPrinter',
    });

    const stats = fs.statSync(outputPath);
    const textStats = analyzeText(text);

    // Analyze the generated PDF
    const analysis = await analyzePdf(outputPath);
    const pageCount = analysis.pageCount || 1;

    // Split for duplex (two-sided) printing
    const duplex = await splitForDuplex(outputPath, session.outputDir, {
      orientation,
      flipEdge,
      evenOrder: 'normal',
    });

    res.json({
      success: true,
      pdfUrl: `/api/txttodoc/output/${sessionId}/text_document.pdf`,
      fileSize: stats.size,
      textStats,
      pageCount,
      analysis,
      duplex: {
        ...duplex,
        oddUrl: `/api/txttodoc/output/${sessionId}/odd_pages.pdf`,
        evenUrl: `/api/txttodoc/output/${sessionId}/even_pages.pdf`,
      },
    });
  } catch (error) {
    console.error('[TxtToDoc] Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/txttodoc/duplex-split - Re-split document with updated orientation or flip edge
 */
router.post('/duplex-split', async (req, res) => {
  try {
    const { sessionId, orientation = 'portrait', flipEdge = 'long-edge' } = req.body;
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const outputPath = path.join(session.outputDir, 'text_document.pdf');
    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ error: 'text_document.pdf not found' });
    }

    const analysis = await analyzePdf(outputPath);
    const duplex = await splitForDuplex(outputPath, session.outputDir, {
      orientation,
      flipEdge,
      evenOrder: 'normal',
    });

    res.json({
      success: true,
      analysis,
      pageCount: analysis.pageCount,
      duplex: {
        ...duplex,
        oddUrl: `/api/txttodoc/output/${sessionId}/odd_pages.pdf`,
        evenUrl: `/api/txttodoc/output/${sessionId}/even_pages.pdf`,
      },
    });
  } catch (error) {
    console.error('[TxtToDoc] Duplex split error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/txttodoc/print-duplex - Print odd or even pages for duplex printing
 */
router.post('/print-duplex', async (req, res) => {
  try {
    const { sessionId, pageSet, mode = 'bw', orientation = 'portrait' } = req.body;
    
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const filename = pageSet === 'odd' ? 'odd_pages.pdf' : 'even_pages.pdf';
    const filePath = path.join(session.outputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `${filename} not found. Generate document first.` });
    }

    const result = await printPdf(filePath, {
      colorMode: mode === 'color' ? 'color' : 'grayscale',
      orientation,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[TxtToDoc] Duplex print error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/txttodoc/output/:sessionId/:filename
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
 * POST /api/txttodoc/end - End session
 */
router.post('/end', (req, res) => {
  const { sessionId } = req.body;
  endSession(sessionId);
  res.json({ success: true });
});

module.exports = router;
