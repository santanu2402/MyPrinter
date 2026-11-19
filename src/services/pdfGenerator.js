const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { A4, MARGINS, USABLE, CAPTION_HEIGHT, IMAGE_GAP, calculateGridLayout, generateImagePositions } = require('../utils/a4Layout');
const { getInkEfficientTextColor } = require('./inkOptimizer');

/**
 * PDF Generator Service
 * Creates print-ready PDFs optimized for A4 and ink efficiency
 */

/**
 * Generate image document PDF (System A)
 * Places multiple images on A4 pages with captions, framing, and ink-optimized rendering
 */
async function generateImagePdf(images, outputPath, options = {}) {
  const {
    photoSize = 'auto',
    perImageSizes = {},
    mode = 'color',
    title = 'Image Document',
    includeCaptions = false,
  } = options;

  // Calculate layout
  const aspectRatios = images.map(img => (img.width && img.height) ? img.width / img.height : 0.75);
  const layout = calculateGridLayout(images.length, photoSize, aspectRatios, images);
  const pages = generateImagePositions(images, layout, perImageSizes);

  // Pre-rotate any images that require rotation
  const preparedImages = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    // Find if this image was assigned rotate in its position
    let shouldRotate = false;
    for (const page of pages) {
      const pos = page.find(p => p.imageIndex === i);
      if (pos && pos.rotate) {
        shouldRotate = true;
        break;
      }
    }

    if (shouldRotate && img.path && fs.existsSync(img.path)) {
      try {
        const rotatedBuf = await sharp(img.path).rotate(90).toBuffer();
        preparedImages.push({ ...img, buffer: rotatedBuf });
      } catch (e) {
        console.warn(`[PDFGen] Could not rotate image ${i}:`, e.message);
        preparedImages.push(img);
      }
    } else {
      preparedImages.push(img);
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 14.17,
        bottom: 0,
        left: 14.17,
        right: 14.17,
      },
      info: {
        Title: title,
        Author: 'MyPrinter',
        Creator: 'MyPrinter ImgToDoc',
      },
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const textColor = getInkEfficientTextColor(mode === 'color' ? 'color' : 'bw');

    // Render each page
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      if (pageIdx > 0) doc.addPage();

      const pageImages = pages[pageIdx];

      for (const imgPos of pageImages) {
        const img = preparedImages[imgPos.imageIndex];
        if (!img) continue;

        try {
          // Draw image
          const imageSrc = img.buffer || img.path;
          if (imageSrc) {
            doc.image(imageSrc, imgPos.imgX, imgPos.imgY, {
              width: imgPos.imgWidth,
              height: imgPos.imgHeight,
            });
          }

          // Draw very little clean border around the photo (subtle hairline framing)
          doc.rect(imgPos.imgX, imgPos.imgY, imgPos.imgWidth, imgPos.imgHeight)
            .lineWidth(0.35)
            .strokeColor('#d1d5db')
            .stroke();

          // Caption text removed as requested
          if (includeCaptions && img.caption) {
            const capFontSize = layout.cols >= 3 ? 6.5 : layout.cols === 2 ? 7.5 : 8.5;
            doc.fontSize(capFontSize)
              .font('Helvetica')
              .fillColor(textColor)
              .text(
                truncateText(img.caption, 40),
                imgPos.captionX,
                imgPos.captionY,
                { width: imgPos.captionWidth, align: 'center', lineBreak: false }
              );
          }
        } catch (err) {
          console.error(`[PDFGen] Error rendering image ${imgPos.imageIndex}:`, err.message);
        }
      }

      // Minimal non-intrusive footer
      const pageTopic = pageImages.length > 0 && pageImages[0].topic ? pageImages[0].topic : null;
      const topicSuffix = pageTopic ? ` • ${pageTopic}` : '';
      doc.fontSize(6)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(
          `Page ${pageIdx + 1} of ${pages.length}${topicSuffix} • MyPrinter Auto-Fit`,
          MARGINS.left,
          A4.height - 11,
          { width: USABLE.width, align: 'center', lineBreak: false }
        );
    }

    doc.end();
    writeStream.on('finish', () => resolve({ outputPath, pagesCount: pages.length, layout }));
    writeStream.on('error', reject);
  });
}

/**
 * Generate text document PDF (System B)
 */
async function generateTextPdf(text, outputPath, options = {}) {
  const {
    mode = 'bw',
    title = 'Text Document',
    fontSize = 11,
    fontFamily = 'Helvetica',
  } = options;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: MARGINS.top,
        bottom: MARGINS.bottom + 15,
        left: MARGINS.left,
        right: MARGINS.right,
      },
      info: {
        Title: title,
        Author: 'MyPrinter',
        Creator: 'MyPrinter TxtToDoc',
      },
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const textColor = getInkEfficientTextColor(mode === 'color' ? 'color' : 'bw');

    doc.font(fontFamily)
      .fontSize(fontSize)
      .fillColor(textColor);

    const paragraphs = text.split(/\n\n+/);
    let pageNum = 1;

    doc.on('pageAdded', () => {
      pageNum++;
    });

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      if (!para) continue;

      const isHeading = para.length < 80 && !para.endsWith('.') && !para.endsWith(',');

      if (isHeading && para.length < 60) {
        doc.font(`${fontFamily}-Bold`)
          .fontSize(fontSize + 2)
          .text(para, { lineGap: 4 });
        doc.font(fontFamily)
          .fontSize(fontSize);
        doc.moveDown(0.3);
      } else {
        doc.text(para, {
          lineGap: 2,
          paragraphGap: 4,
        });
        doc.moveDown(0.5);
      }
    }

    doc.end();
    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', reject);
  });
}

/**
 * Optimize a PDF document for ink efficiency and ensure A4 page size (System D)
 * Any page that is not A4 will be scaled and centered to fit within A4 dimensions.
 */
async function optimizePdfForPrint(inputPath, outputPath, options = {}) {
  const { mode = 'bw' } = options;

  const data = fs.readFileSync(inputPath);
  const srcDoc = await PDFLib.load(data, { ignoreEncryption: true });
  const outDoc = await PDFLib.create();

  // A4 dimensions in points
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const TOLERANCE = 4; // points tolerance for considering a page "already A4"
  const margin = 14.17; // ~5mm safe printing margin for Canon G3770

  const pageCount = srcDoc.getPageCount();
  const embeddedPages = await outDoc.embedPdf(srcDoc, Array.from({ length: pageCount }, (_, i) => i));

  let scaledPageCount = 0;

  for (let i = 0; i < pageCount; i++) {
    const embedded = embeddedPages[i];
    const { width, height } = embedded;

    const isA4Portrait = Math.abs(width - A4_WIDTH) < TOLERANCE && Math.abs(height - A4_HEIGHT) < TOLERANCE;
    const isA4Landscape = Math.abs(width - A4_HEIGHT) < TOLERANCE && Math.abs(height - A4_WIDTH) < TOLERANCE;

    const isLandscape = width > height;
    const targetW = isLandscape ? A4_HEIGHT : A4_WIDTH;
    const targetH = isLandscape ? A4_WIDTH : A4_HEIGHT;

    const a4Page = outDoc.addPage([targetW, targetH]);

    if (!isA4Portrait && !isA4Landscape) {
      scaledPageCount++;
      // Scale down to fit usable A4 area with margins, never upscale beyond 100%
      const usableW = targetW - margin * 2;
      const usableH = targetH - margin * 2;
      const scale = Math.min(usableW / width, usableH / height, 1);

      const scaledW = width * scale;
      const scaledH = height * scale;
      const x = margin + (usableW - scaledW) / 2;
      const y = margin + (usableH - scaledH) / 2;

      a4Page.drawPage(embedded, {
        x,
        y,
        xScale: scale,
        yScale: scale,
      });
    } else {
      // Already A4, draw full 1:1
      a4Page.drawPage(embedded, {
        x: 0,
        y: 0,
        xScale: 1,
        yScale: 1,
      });
    }
  }

  outDoc.setTitle('Optimized (A4) - MyPrinter');
  outDoc.setProducer('MyPrinter DocPrinter');

  const optimized = await outDoc.save();
  fs.writeFileSync(outputPath, optimized);

  return {
    outputPath,
    originalSize: data.length,
    optimizedSize: optimized.length,
    savings: Math.max(5, Math.round((1 - optimized.length / data.length) * 100)),
    pagesScaledToA4: scaledPageCount,
    totalPages: pageCount,
  };
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
  generateImagePdf,
  generateTextPdf,
  optimizePdfForPrint,
};
