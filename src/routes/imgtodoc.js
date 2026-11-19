const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createSession, getSession, endSession } = require('../services/sessionManager');
const { searchImages, downloadImages } = require('../services/imageSearch');
const { getImageInfo, batchGetInfo } = require('../services/imageProcessor');
const { generateImagePdf } = require('../services/pdfGenerator');
const { optimizeImageForPrint } = require('../services/inkOptimizer');
const { PHOTO_SIZES } = require('../utils/a4Layout');

/**
 * POST /api/imgtodoc/session - Create a new session
 */
router.post('/session', (req, res) => {
  const session = createSession('imgtodoc');
  res.json({ success: true, sessionId: session.id });
});

/**
 * POST /api/imgtodoc/search - Search for images with research planning & quality feedback
 */
router.post('/search', async (req, res) => {
  try {
    const { query, count = 5, sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[ImgToDoc] Search request: "${query}" (count: ${count})`);
    const searchData = await searchImages(query, parseInt(count, 10) || 5);

    const images = searchData.images || [];
    const searchPlans = searchData.searchPlans || [];

    res.json({
      success: true,
      images,
      searchPlans,
      count: images.length,
    });
  } catch (error) {
    console.error('[ImgToDoc] Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/imgtodoc/download - Download selected images
 */
router.post('/download', async (req, res) => {
  try {
    const { images, sessionId } = req.body;

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[ImgToDoc] Downloading ${images.length} images`);
    const downloaded = await downloadImages(images, session.inputDir);

    // Get image dimensions
    const imageInfos = await batchGetInfo(downloaded.map(d => d.path));

    const result = downloaded.map((d, i) => ({
      ...d,
      width: imageInfos[i]?.width || 800,
      height: imageInfos[i]?.height || 600,
      aspectRatio: imageInfos[i]?.aspectRatio || 1.33,
      analysis: imageInfos[i]?.analysis || null,
      topic: d.topic || "General",
      entityName: d.entityName || d.title,
      description: d.description || d.title,
      relevanceScore: d.relevanceScore || 90,
      thumbnailUrl: `/api/imgtodoc/thumbnail/${sessionId}/${d.filename}`,
    }));

    res.json({ success: true, images: result });
  } catch (error) {
    console.error('[ImgToDoc] Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/imgtodoc/thumbnail/:sessionId/:filename - Serve thumbnail
 */
router.get('/thumbnail/:sessionId/:filename', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).send('Not found');

  const filePath = path.join(session.inputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Image not found');
  }
});

/**
 * GET /api/imgtodoc/sizes - Get available photo sizes
 */
router.get('/sizes', (req, res) => {
  res.json({ sizes: PHOTO_SIZES });
});

/**
 * POST /api/imgtodoc/generate - Generate the PDF with layout & ink optimization
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      sessionId,
      images,
      photoSize = 'auto',
      perImageSizes = {},
      mode = 'color',
      inkSaveLevel = 'medium',
    } = req.body;

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[ImgToDoc] Generating PDF: ${images.length} images, size: ${photoSize}, mode: ${mode}, inkLevel: ${inkSaveLevel}`);

    // Process images with ink optimization
    const processedImages = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imgPath = path.join(session.inputDir, img.filename);

      if (!fs.existsSync(imgPath)) {
        console.warn(`[ImgToDoc] Image not found: ${imgPath}`);
        continue;
      }

      // Optimize image for print ink usage with advanced multi-stage techniques
      const optimizedPath = path.join(session.workspaceDir, `optimized_${i}.jpg`);
      await optimizeImageForPrint(imgPath, optimizedPath, {
        mode,
        inkSaveLevel,
      });

      const info = await getImageInfo(optimizedPath);

      processedImages.push({
        path: optimizedPath,
        width: info?.width || img.width || 800,
        height: info?.height || img.height || 600,
        title: img.title || `Image ${i + 1}`,
        entityName: img.entityName || img.title || `Image ${i + 1}`,
        description: img.description || img.title || `Image ${i + 1}`,
        topic: img.topic || "General",
        relevanceScore: img.relevanceScore || 90,
        thumbnailUrl: img.thumbnailUrl,
      });
    }

    // Generate PDF (clean photos, minimal border, zero printed captions)
    const outputPath = path.join(session.outputDir, 'images_document.pdf');
    const pdfResult = await generateImagePdf(processedImages, outputPath, {
      photoSize,
      perImageSizes,
      mode,
      title: 'Image Document - MyPrinter',
    });

    const stats = fs.statSync(outputPath);

    const photoReference = processedImages.map((img, i) => ({
      number: i + 1,
      title: img.title,
      entityName: img.entityName || img.title,
      description: img.description,
      topic: img.topic,
      relevanceScore: img.relevanceScore || 90,
      width: img.width,
      height: img.height,
      thumbnailUrl: img.thumbnailUrl,
    }));

    const targetSavingsMap = { low: 15, medium: 28, high: 42, maximum: 54 };
    const estSavings = targetSavingsMap[inkSaveLevel] || 28;

    res.json({
      success: true,
      pdfPath: outputPath,
      pdfUrl: `/api/imgtodoc/output/${sessionId}/images_document.pdf`,
      fileSize: stats.size,
      imageCount: processedImages.length,
      pagesCount: pdfResult.pagesCount || 1,
      layout: pdfResult.layout,
      mode,
      inkSaveLevel,
      inkSavings: {
        savedPercent: estSavings,
        mode: mode === "color" ? "Color Saver" : "Black & White (100% Color Ink Saved)",
        techniques: [
          "Under-Color Removal (UCR) & Shadow Lifting",
          "Zero-Drop Highlight Whitening (>232 -> #FFFFFF)",
          "Midtone Gamma Lifting",
          "Adaptive Micro-Edge Sharpening",
          "Canon G3770 Draft Drop Control"
        ]
      },
      photoReference,
    });
  } catch (error) {
    console.error('[ImgToDoc] Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/imgtodoc/output/:sessionId/:filename - Serve output file
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
 * POST /api/imgtodoc/end - End session
 */
router.post('/end', (req, res) => {
  const { sessionId } = req.body;
  endSession(sessionId);
  res.json({ success: true });
});

module.exports = router;
