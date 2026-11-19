const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Image Processor Service
 * Handles image analysis, resizing, rotation, and preparation for PDF embedding
 */

/**
 * Analyze image resolution, aspect ratio, and color brightness/density
 * Recommends optimal Small or Medium print size
 */
function analyzeImageContent(metadata, stats) {
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const aspect = width / height;
  const megapixels = (width * height) / 1000000;

  // Calculate average brightness across RGB channels (0-255)
  const channels = stats?.channels || [];
  const avgBrightness = channels.length > 0
    ? channels.slice(0, 3).reduce((acc, c) => acc + (c.mean || 128), 0) / Math.min(3, channels.length)
    : 128;

  // Ink density classification
  let inkDensity = 'Moderate';
  let inkBadgeClass = 'badge-moderate';
  if (avgBrightness < 100) {
    inkDensity = 'Dense (Dark shadows, ink saver recommended)';
    inkBadgeClass = 'badge-heavy';
  } else if (avgBrightness > 165) {
    inkDensity = 'Light (Clean background, minimal ink)';
    inkBadgeClass = 'badge-light';
  }

  // Orientation
  let orientation = 'square';
  if (aspect >= 1.2) orientation = 'landscape';
  else if (aspect <= 0.85) orientation = 'portrait';

  // Sizing Decision — Strictly Small to Medium
  // 1. Low resolution (< 0.6 MP or dimensions < 700px): Small (Wallet/Passport)
  // 2. Wide or tall panoramic: Medium 3.5×5"
  // 3. Crisp moderate/high resolution: Capped at Medium 4×6" (never larger)
  let recommendedSize = 'medium-4x6';
  let sizeLabel = 'Medium (4×6" / 10×15 cm)';
  let reasoning = '';

  if (megapixels < 0.6 || Math.max(width, height) < 700) {
    recommendedSize = 'small-wallet';
    sizeLabel = 'Small Wallet (64×89 mm)';
    reasoning = `Native ${width}×${height}px is best at Small size for sharp 200+ DPI & minimal ink.`;
  } else if (aspect > 1.6 || aspect < 0.6) {
    recommendedSize = 'medium-3x5';
    sizeLabel = 'Medium (3.5×5" / 9×13 cm)';
    reasoning = `Aspect ratio ${aspect.toFixed(2)} fits best in compact 3.5×5" format.`;
  } else {
    recommendedSize = 'medium-4x6';
    sizeLabel = 'Medium (4×6" / 10×15 cm)';
    reasoning = `Crisp ${width}×${height}px capped at Medium 4×6" to avoid oversized print & ink waste.`;
  }

  return {
    width,
    height,
    aspect: Math.round(aspect * 100) / 100,
    megapixels: Math.round(megapixels * 10) / 10,
    orientation,
    avgBrightness: Math.round(avgBrightness),
    inkDensity,
    inkBadgeClass,
    recommendedSize,
    sizeLabel,
    reasoning,
  };
}

/**
 * Get detailed image info and content analysis
 */
async function getImageInfo(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats().catch(() => null);
    const analysis = analyzeImageContent(metadata, stats);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      aspectRatio: metadata.width / metadata.height,
      analysis,
    };
  } catch (error) {
    console.error(`[ImageProcessor] Error reading metadata for ${imagePath}:`, error.message);
    return null;
  }
}

/**
 * Resize an image to fit within given dimensions while maintaining aspect ratio
 */
async function resizeImage(inputPath, outputPath, maxWidth, maxHeight, options = {}) {
  const { quality = 90, format = 'jpeg' } = options;
  
  let pipeline = sharp(inputPath)
    .rotate()
    .resize(Math.round(maxWidth), Math.round(maxHeight), {
      fit: 'inside',
      withoutEnlargement: true,
    });

  if (format === 'png') {
    await pipeline.png({ quality }).toFile(outputPath);
  } else {
    await pipeline.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
  }

  return outputPath;
}

/**
 * Process an image for PDF embedding
 */
async function processForPdf(imagePath, maxWidth, maxHeight, options = {}) {
  const { mode = 'color', inkSaveLevel = 'medium' } = options;
  
  let pipeline = sharp(imagePath)
    .rotate();

  pipeline = pipeline.resize(Math.round(maxWidth * 2), Math.round(maxHeight * 2), {
    fit: 'inside',
    withoutEnlargement: false,
  });

  if (mode === 'grayscale') {
    pipeline = pipeline.grayscale();
    pipeline = pipeline.modulate({ brightness: 1.08 });
  } else {
    const satLevels = { low: 0.88, medium: 0.75, high: 0.60 };
    pipeline = pipeline.modulate({
      saturation: satLevels[inkSaveLevel] || 0.75,
      brightness: 1.06,
    });
  }

  pipeline = pipeline.sharpen({ sigma: 1.0 });

  const buffer = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return buffer;
}

/**
 * Create a thumbnail
 */
async function createThumbnail(inputPath, outputPath, size = 200) {
  await sharp(inputPath)
    .rotate()
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 75 })
    .toFile(outputPath);
  return outputPath;
}

/**
 * Batch process images - get info and analysis for all
 */
async function batchGetInfo(imagePaths) {
  const results = [];
  for (const imgPath of imagePaths) {
    const info = await getImageInfo(imgPath);
    if (info) {
      results.push({ path: imgPath, ...info });
    }
  }
  return results;
}

module.exports = {
  analyzeImageContent,
  getImageInfo,
  resizeImage,
  processForPdf,
  createThumbnail,
  batchGetInfo,
};
