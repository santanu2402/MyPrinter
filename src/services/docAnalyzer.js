const fs = require('fs');
const path = require('path');
const { PDFDocument, degrees } = require('pdf-lib');
const pdfParse = require('pdf-parse');

/**
 * Document Analyzer Service
 * Analyzes PDF/document content for optimization
 */

/**
 * Analyze a PDF document
 */
async function analyzePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  
  // Parse PDF for text content (with 3-second timeout so complex PDFs never hang)
  let textContent = '';
  let pageCount = 0;
  
  try {
    const parsePromise = pdfParse(dataBuffer);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('pdf-parse timeout')), 3000));
    const parsed = await Promise.race([parsePromise, timeoutPromise]);
    textContent = parsed.text || '';
    pageCount = parsed.numpages || 0;
  } catch (e) {
    console.warn('[DocAnalyzer] pdf-parse skipped/warning:', e.message);
  }

  // Load with pdf-lib for structural analysis
  const pdfDoc = await PDFDocument.load(dataBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  pageCount = pages.length;

  const analysis = {
    pageCount,
    textLength: textContent.length,
    wordCount: textContent.split(/\s+/).filter(w => w.length > 0).length,
    hasImages: false,
    estimatedInkCoverage: 'medium',
    colorProfile: 'unknown',
    fileSize: dataBuffer.length,
    pages: [],
  };

  // Analyze each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    
    analysis.pages.push({
      number: i + 1,
      width: Math.round(width),
      height: Math.round(height),
      orientation: width > height ? 'landscape' : 'portrait',
    });
  }

  // Estimate if document has heavy ink usage
  const sizePerPage = dataBuffer.length / pageCount;
  if (sizePerPage > 500000) {
    analysis.estimatedInkCoverage = 'high';
    analysis.hasImages = true;
  } else if (sizePerPage > 100000) {
    analysis.estimatedInkCoverage = 'medium';
    analysis.hasImages = true;
  } else {
    analysis.estimatedInkCoverage = 'low';
  }

  // Check for color content in the raw PDF data
  const pdfString = dataBuffer.toString('latin1');
  if (pdfString.includes('/DeviceRGB') || pdfString.includes('/DeviceCMYK') || pdfString.includes('/ICCBased')) {
    analysis.colorProfile = 'color';
  } else {
    analysis.colorProfile = 'grayscale';
  }

  analysis.recommendation = generateRecommendation(analysis);
  
  return analysis;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendation(analysis) {
  const recommendations = [];
  
  if (analysis.colorProfile === 'color' && analysis.estimatedInkCoverage !== 'low') {
    recommendations.push('Document contains color content. Switching to grayscale can save significant ink.');
  }
  
  if (analysis.hasImages) {
    recommendations.push('Document contains images. Optimizing image quality can reduce ink usage.');
  }
  
  if (analysis.estimatedInkCoverage === 'high') {
    recommendations.push('High ink coverage detected. Consider using draft quality for non-critical prints.');
  }
  
  if (analysis.pageCount > 4) {
    recommendations.push(`${analysis.pageCount} pages detected. Consider duplex printing to save paper.`);
  }

  // Check for non-A4 pages
  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;
  const TOLERANCE = 5;
  const nonA4Pages = (analysis.pages || []).filter(p => {
    const isA4Portrait = Math.abs(p.width - A4_WIDTH) < TOLERANCE && Math.abs(p.height - A4_HEIGHT) < TOLERANCE;
    const isA4Landscape = Math.abs(p.width - A4_HEIGHT) < TOLERANCE && Math.abs(p.height - A4_WIDTH) < TOLERANCE;
    return !isA4Portrait && !isA4Landscape;
  });

  if (nonA4Pages.length > 0) {
    const sizes = nonA4Pages.map(p => `${p.width}×${p.height}pt`);
    const unique = [...new Set(sizes)].join(', ');
    recommendations.push(`${nonA4Pages.length} page(s) are not A4 size (${unique}). Optimize to auto-scale all pages to A4.`);
  }
  
  return {
    suggestedMode: analysis.estimatedInkCoverage === 'low' ? 'bw' : 'optimize',
    suggestions: recommendations,
    estimatedInkSaving: analysis.colorProfile === 'color' ? '30-50%' : '10-20%',
    nonA4PageCount: nonA4Pages.length,
  };
}

/**
 * Split PDF into odd and even pages for manual duplex printing
 * @param {string} inputPath
 * @param {string} outputDir
 * @param {object} options { orientation: 'portrait'|'landscape', flipEdge: 'long-edge'|'short-edge', evenOrder: 'normal'|'reverse' }
 */
async function splitForDuplex(inputPath, outputDir, options = {}) {
  const dataBuffer = fs.readFileSync(inputPath);
  const srcDoc = await PDFDocument.load(dataBuffer, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  // Auto-detect orientation from first page if not specified
  let detectedOrientation = 'portrait';
  if (pageCount > 0) {
    const firstPage = srcDoc.getPages()[0];
    const { width, height } = firstPage.getSize();
    if (width > height) detectedOrientation = 'landscape';
  }

  const orientation = options.orientation || detectedOrientation;
  // Defaults: portrait flips on long-edge (left sided), landscape flips on short-edge
  const flipEdge = options.flipEdge || (orientation === 'landscape' ? 'short-edge' : 'long-edge');
  const evenOrder = options.evenOrder || 'normal'; // 'normal' = 2, 4, 6... (natural printer feed order)

  // Create odd pages document (1, 3, 5, ...)
  const oddDoc = await PDFDocument.create();
  // Create even pages document (2, 4, 6, ...)
  const evenDoc = await PDFDocument.create();
  
  const oddIndices = [];
  const evenIndices = [];
  
  for (let i = 0; i < pageCount; i++) {
    if (i % 2 === 0) {
      oddIndices.push(i); // Pages 1, 3, 5, ... (0-indexed: 0, 2, 4, ...)
    } else {
      evenIndices.push(i); // Pages 2, 4, 6, ... (0-indexed: 1, 3, 5, ...)
    }
  }
  
  // Helper to ensure page dimensions strictly fit A4
  function fitPageToA4(page, targetOrientation) {
    const { width, height } = page.getSize();
    const isLandscape = targetOrientation === 'landscape' || width > height;
    const targetW = isLandscape ? 841.89 : 595.28;
    const targetH = isLandscape ? 595.28 : 841.89;

    const isA4 = Math.abs(width - targetW) < 4 && Math.abs(height - targetH) < 4;
    if (isA4) return;

    const margin = 14.17; // ~5mm safe margin
    const usableW = targetW - margin * 2;
    const usableH = targetH - margin * 2;
    const scale = Math.min(usableW / width, usableH / height, 1);

    const scaledW = width * scale;
    const scaledH = height * scale;
    const offsetX = margin + (usableW - scaledW) / 2;
    const offsetY = margin + (usableH - scaledH) / 2;

    page.setSize(targetW, targetH);
    page.scaleContent(scale, scale);
    page.translateContent(offsetX / scale, offsetY / scale);
  }

  // Copy odd pages
  if (oddIndices.length > 0) {
    const copiedOdd = await oddDoc.copyPages(srcDoc, oddIndices);
    copiedOdd.forEach(page => {
      fitPageToA4(page, orientation);
      oddDoc.addPage(page);
    });
  }
  
  // Copy even pages in specified order (default 'normal': 2, 4, 6...)
  if (evenIndices.length > 0) {
    const orderIndices = evenOrder === 'reverse' ? [...evenIndices].reverse() : [...evenIndices];
    const copiedEven = await evenDoc.copyPages(srcDoc, orderIndices);

    // Apply rotation if required for flipping alignment on Canon G3770
    // Canon G3770 rear-tray feed: after flipping sheets and reinserting,
    // the even pages come out inverted top-to-bottom for the default flip directions.
    // Portrait + long-edge or Landscape + short-edge requires 180° rotation on back pages.
    const needs180Rotation = 
      (orientation === 'portrait' && flipEdge === 'long-edge') ||
      (orientation === 'landscape' && flipEdge === 'short-edge');

    copiedEven.forEach(page => {
      fitPageToA4(page, orientation);
      if (needs180Rotation) {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + 180) % 360));
      }
      evenDoc.addPage(page);
    });
  }
  
  // Save odd and even files
  const oddPath = path.join(outputDir, 'odd_pages.pdf');
  const evenPath = path.join(outputDir, 'even_pages.pdf');
  
  fs.writeFileSync(oddPath, await oddDoc.save());
  fs.writeFileSync(evenPath, await evenDoc.save());

  // Generate dynamic instructions based on orientation and flip edge
  const flipDesc = orientation === 'portrait'
    ? (flipEdge === 'long-edge' 
        ? 'Flip sheets horizontally along the long edge (like turning the page of a book), keeping the top edge facing UP.'
        : 'Flip sheets vertically along the short edge (like flipping a notepad), so the top edge moves to the bottom.')
    : (flipEdge === 'short-edge'
        ? 'Flip sheets horizontally along the short edge (like turning a booklet or calendar), keeping the orientation aligned.'
        : 'Flip sheets vertically along the long edge, keeping the alignment consistent.');

  return {
    oddPath,
    evenPath,
    oddPageCount: oddIndices.length,
    evenPageCount: evenIndices.length,
    totalPages: pageCount,
    orientation,
    flipEdge,
    evenOrder,
    instructions: [
      `Step 1: Print Odd Pages (${oddIndices.length} pages) — Front sides`,
      'Step 2: Collect the printed sheets as they come out of the output tray',
      `Step 3: ${flipDesc}`,
      'Step 4: Re-insert the stack into the rear tray with the blank side facing forward',
      `Step 5: Confirm reload, then print Even Pages (${evenIndices.length} pages) — Back sides`,
      `Result: Double-sided printing complete (${orientation.toUpperCase()} • ${flipEdge === 'long-edge' ? 'Flip on Long Edge (Left)' : 'Flip on Short Edge'})!`,
    ],
  };
}

module.exports = {
  analyzePdf,
  splitForDuplex,
  generateRecommendation,
};

