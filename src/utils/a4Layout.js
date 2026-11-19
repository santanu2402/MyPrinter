/**
 * A4 Layout Engine
 * Handles optimal placement, rotation, and framing of images and text on A4 pages
 * Designed strictly for Small to Medium images to minimize ink, maximize paper efficiency,
 * and maintain 2 to 3 mm gaps between images with minimal borders.
 * 
 * A4 dimensions: 210mm × 297mm = 595.28pt × 841.89pt (at 72 DPI)
 */

const A4 = {
  width: 595.28,   // points
  height: 841.89,  // points
  widthMm: 210,
  heightMm: 297,
};

// Minimal page margins (~5mm each side) - eliminates giant border margins
const MARGINS = {
  top: 14.17,    // ~5mm
  bottom: 14.17, // ~5mm
  left: 14.17,   // ~5mm
  right: 14.17,  // ~5mm
};

// Usable area
const USABLE = {
  width: A4.width - MARGINS.left - MARGINS.right,   // ~566.94pt (~200mm)
  height: A4.height - MARGINS.top - MARGINS.bottom,  // ~813.55pt (~287mm)
};

// Caption height reservation (in points) - 0 because captions are UI-only
const CAPTION_HEIGHT = 0;

// 2 to 3 mm gap between images (7.08 pt ≈ 2.5 mm)
const IMAGE_GAP = 7.08;

/**
 * Standard photo sizes in mm (Focused strictly on Small to Medium)
 */
const PHOTO_SIZES = {
  auto: { width: 0, height: 0, label: '🎯 AI Smart Fit (Less Paper, Small-to-Medium)' },
  "small-passport": { width: 35, height: 45, label: 'Mini / Passport (35×45 mm)' },
  "small-wallet": { width: 63.5, height: 89, label: 'Small Wallet (64×89 mm / 2.5×3.5")' },
  "medium-3x5": { width: 89, height: 127, label: 'Medium 3.5×5" (89×127 mm)' },
  "medium-4x6": { width: 102, height: 152, label: 'Medium 4×6" (102×152 mm / 10×15 cm)' },
  "medium-a6": { width: 105, height: 148, label: 'Medium A6 Postcard (105×148 mm)' },
};

/**
 * Convert mm to points
 */
function mmToPt(mm) {
  return mm * (72 / 25.4);
}

/**
 * Convert points to mm
 */
function ptToMm(pt) {
  return pt * (25.4 / 72);
}

/**
 * Helper to compute grid and layout for a page with count images
 * Focused strictly on Small to Medium size (never micro-thumbnails)
 */
function getPageGrid(count) {
  if (count === 1) {
    // Medium centered (max 130x170mm)
    const w = mmToPt(130);
    const h = mmToPt(170);
    return {
      cols: 1,
      rows: 1,
      cellWidth: w,
      cellHeight: h,
      startX: MARGINS.left + (USABLE.width - w) / 2,
      startY: MARGINS.top + (USABLE.height - h) / 2,
    };
  }
  if (count === 2) {
    // 2 stacked vertically (each ~130x142mm)
    const cellW = mmToPt(130);
    const cellH = (USABLE.height - IMAGE_GAP) / 2;
    return {
      cols: 1,
      rows: 2,
      cellWidth: cellW,
      cellHeight: cellH,
      startX: MARGINS.left + (USABLE.width - cellW) / 2,
      startY: MARGINS.top,
    };
  }
  if (count <= 4) {
    // 2x2 grid (each ~98.8x142.3mm / classic 4x6" medium)
    const cols = 2;
    const rows = 2;
    return {
      cols,
      rows,
      cellWidth: (USABLE.width - IMAGE_GAP) / cols,
      cellHeight: (USABLE.height - IMAGE_GAP) / rows,
      startX: MARGINS.left,
      startY: MARGINS.top,
    };
  }
  // 5 or 6 images: 2x3 grid (each ~98.8x94.0mm / small-to-medium)
  const cols = 2;
  const rows = 3;
  return {
    cols,
    rows,
    cellWidth: (USABLE.width - IMAGE_GAP) / cols,
    cellHeight: (USABLE.height - 2 * IMAGE_GAP) / rows,
    startX: MARGINS.left,
    startY: MARGINS.top,
  };
}

/**
 * Render a single page batch into positioned image descriptors
 */
function renderPageBatch(batch, pageTopic) {
  const grid = getPageGrid(batch.length);
  const pageItems = [];

  batch.forEach((item, slotIdx) => {
    const pageRow = Math.floor(slotIdx / grid.cols);
    const pageCol = slotIdx % grid.cols;

    const cellX = grid.startX + pageCol * (grid.cellWidth + IMAGE_GAP);
    const cellY = grid.startY + pageRow * (grid.cellHeight + IMAGE_GAP);

    const fit = fitImageInCell(item.img.width || 800, item.img.height || 600, grid.cellWidth, grid.cellHeight, false);

    pageItems.push({
      imageIndex: item.idx,
      cellX,
      cellY,
      imgX: cellX + fit.x,
      imgY: cellY + fit.y,
      imgWidth: fit.width,
      imgHeight: fit.height,
      rotate: fit.rotate,
      captionX: cellX,
      captionY: cellY + fit.height,
      captionWidth: fit.width,
      topic: pageTopic || item.img.topic || null,
    });
  });

  return pageItems;
}

/**
 * Intelligent Multi-Page Auto-Layout
 * Groups by topic when multiple topics exist, or balances images across pages (max 6 per page)
 * Guarantees every image is a clear Small-to-Medium print (98-130mm wide)
 */
function buildAutoPages(images) {
  const uniqueTopics = [...new Set(images.map(img => img.topic).filter(Boolean))];
  const pages = [];

  if (uniqueTopics.length > 1) {
    // Topic-aware grouping: each topic gets its own dedicated page(s)
    const topicMap = new Map();
    images.forEach((img, idx) => {
      const t = img.topic || "General";
      if (!topicMap.has(t)) topicMap.set(t, []);
      topicMap.get(t).push({ img, idx });
    });

    for (const [topic, items] of topicMap.entries()) {
      // Chunk topic items into max 6 per page
      for (let i = 0; i < items.length; i += 6) {
        const batch = items.slice(i, i + 6);
        pages.push(renderPageBatch(batch, topic));
      }
    }
  } else {
    // Single or no topic: evenly balance images across pages (max 6 per page)
    const N = images.length;
    const pagesNeeded = Math.max(1, Math.ceil(N / 6));
    const baseCount = Math.floor(N / pagesNeeded);
    const remainder = N % pagesNeeded;
    let curIdx = 0;

    for (let p = 0; p < pagesNeeded; p++) {
      const count = p < remainder ? baseCount + 1 : baseCount;
      const batch = [];
      for (let c = 0; c < count && curIdx < N; c++) {
        batch.push({ img: images[curIdx], idx: curIdx });
        curIdx++;
      }
      pages.push(renderPageBatch(batch, images[0] ? images[0].topic : null));
    }
  }

  return pages;
}

/**
 * Calculate optimal grid layout for uniform sizes
 */
function calculateGridLayout(imageCount, photoSize = "auto", imageAspectRatios = [], imageList = []) {
  if (photoSize !== "auto" && PHOTO_SIZES[photoSize] && PHOTO_SIZES[photoSize].width > 0) {
    const size = PHOTO_SIZES[photoSize];
    const cellW = mmToPt(size.width);
    const cellH = mmToPt(size.height);

    const colsNormal = Math.max(1, Math.floor((USABLE.width + IMAGE_GAP) / (cellW + IMAGE_GAP)));
    const rowsNormal = Math.max(1, Math.floor((USABLE.height + IMAGE_GAP) / (cellH + CAPTION_HEIGHT + IMAGE_GAP)));

    const colsRot = Math.max(1, Math.floor((USABLE.width + IMAGE_GAP) / (cellH + IMAGE_GAP)));
    const rowsRot = Math.max(1, Math.floor((USABLE.height + IMAGE_GAP) / (cellW + CAPTION_HEIGHT + IMAGE_GAP)));

    let cols = colsNormal;
    let rows = rowsNormal;
    let finalW = cellW;
    let finalH = cellH;
    let autoRotate = false;

    if (colsRot * rowsRot > colsNormal * rowsNormal) {
      cols = colsRot;
      rows = rowsRot;
      finalW = cellH;
      finalH = cellW;
      autoRotate = true;
    }

    const perPage = Math.max(1, cols * rows);
    const pagesNeeded = Math.ceil(imageCount / perPage);

    return {
      cols,
      rows,
      cellWidth: finalW,
      cellHeight: finalH,
      captionHeight: CAPTION_HEIGHT,
      perPage,
      pagesNeeded,
      photoSize,
      autoRotate,
    };
  }

  // AUTO LAYOUT - Intelligent Small-to-Medium Multi-Page Distribution
  // Never shrink images below readable Small-to-Medium threshold (98-130mm wide)
  // Up to 6 images fit naturally on 1 page in a 2x3 grid; >6 images distribute across balanced pages
  const uniqueTopics = imageList && imageList.length > 0
    ? [...new Set(imageList.map(img => img.topic).filter(Boolean))]
    : [];

  let pagesNeeded = 1;
  let cols = 2;
  let rows = 3;

  if (uniqueTopics.length > 1) {
    const topicMap = new Map();
    imageList.forEach(img => {
      const t = img.topic || "General";
      topicMap.set(t, (topicMap.get(t) || 0) + 1);
    });
    pagesNeeded = 0;
    for (const count of topicMap.values()) {
      pagesNeeded += Math.ceil(count / 6);
    }
  } else {
    pagesNeeded = Math.max(1, Math.ceil(imageCount / 6));
  }

  if (imageCount === 1) {
    cols = 1;
    rows = 1;
  } else if (imageCount === 2) {
    cols = 1;
    rows = 2;
  } else if (imageCount <= 4 && pagesNeeded === 1) {
    cols = 2;
    rows = 2;
  } else {
    cols = 2;
    rows = 3;
  }

  const cellWidth = (USABLE.width - (cols - 1) * IMAGE_GAP) / cols;
  const cellHeight = (USABLE.height - (rows - 1) * IMAGE_GAP) / rows;

  return {
    cols,
    rows,
    cellWidth,
    cellHeight,
    captionHeight: CAPTION_HEIGHT,
    perPage: cols * rows,
    pagesNeeded,
    photoSize: "auto",
    autoRotate: false,
    topicAware: uniqueTopics.length > 1,
  };
}

/**
 * Calculate image placement inside cell, testing rotation for best space utilization
 */
function fitImageInCell(imgWidth, imgHeight, cellWidth, cellHeight, allowRotate = false) {
  const w = imgWidth || 800;
  const h = imgHeight || 600;

  // Upright natural scale
  const scaleNormal = Math.min(cellWidth / w, cellHeight / h);
  const normalW = w * scaleNormal;
  const normalH = h * scaleNormal;

  let rotate = false;
  let fitWidth = normalW;
  let fitHeight = normalH;

  // Rotate only when allowRotate is active or extreme banner ratio (>2.4)
  const aspect = Math.max(w / h, h / w);
  if (allowRotate || aspect > 2.4) {
    const scaleRotated = Math.min(cellWidth / h, cellHeight / w);
    const rotatedW = h * scaleRotated;
    const rotatedH = w * scaleRotated;
    if ((rotatedW * rotatedH) > (normalW * normalH) * 1.35) {
      rotate = true;
      fitWidth = rotatedW;
      fitHeight = rotatedH;
    }
  }

  // Center within the cell
  const x = (cellWidth - fitWidth) / 2;
  const y = (cellHeight - fitHeight) / 2;

  return { x, y, width: fitWidth, height: fitHeight, rotate };
}

/**
 * Generate positions for all images across pages (uniform or per-image size)
 */
function generateImagePositions(images, layout, perImageSizes = {}) {
  const hasSpecificSizes = Object.keys(perImageSizes).length > 0 &&
    Object.values(perImageSizes).some(s => s && s !== "auto" && s !== layout.photoSize);

  // If auto sizing, use intelligent Small-to-Medium multi-page distribution
  if (layout.photoSize === "auto" && !hasSpecificSizes) {
    return buildAutoPages(images);
  }

  if (!hasSpecificSizes) {
    const pages = [];
    let currentPage = [];
    let countOnPage = 0;

    for (let i = 0; i < images.length; i++) {
      const pageRow = Math.floor(countOnPage / layout.cols);
      const pageCol = countOnPage % layout.cols;

      const cellX = MARGINS.left + pageCol * (layout.cellWidth + IMAGE_GAP);
      const cellY = MARGINS.top + pageRow * (layout.cellHeight + CAPTION_HEIGHT + IMAGE_GAP);

      const img = images[i];
      const fit = fitImageInCell(img.width || 800, img.height || 600, layout.cellWidth, layout.cellHeight, layout.autoRotate);

      currentPage.push({
        imageIndex: i,
        cellX,
        cellY,
        imgX: cellX + fit.x,
        imgY: cellY + fit.y,
        imgWidth: fit.width,
        imgHeight: fit.height,
        rotate: fit.rotate,
        captionX: cellX,
        captionY: cellY + layout.cellHeight,
        captionWidth: layout.cellWidth,
        topic: img.topic || null,
      });

      countOnPage++;

      if (countOnPage >= layout.perPage || i === images.length - 1) {
        pages.push(currentPage);
        currentPage = [];
        countOnPage = 0;
      }
    }

    return pages;
  }

  // Shelf-based packing for mixed / per-image sizes
  const pages = [];
  let currentPage = [];
  let curX = MARGINS.left;
  let curY = MARGINS.top;
  let shelfHeight = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const sizeKey = perImageSizes[i] || layout.photoSize || "auto";
    let targetW, targetH;

    if (sizeKey !== "auto" && PHOTO_SIZES[sizeKey] && PHOTO_SIZES[sizeKey].width > 0) {
      targetW = mmToPt(PHOTO_SIZES[sizeKey].width);
      targetH = mmToPt(PHOTO_SIZES[sizeKey].height);
    } else {
      targetW = layout.cellWidth || 200;
      targetH = layout.cellHeight || 200;
    }

    const fit = fitImageInCell(img.width || 800, img.height || 600, targetW, targetH);
    const itemTotalHeight = fit.height + CAPTION_HEIGHT;

    // Check if item fits in current shelf
    if (curX + fit.width > A4.width - MARGINS.right && curX > MARGINS.left) {
      curX = MARGINS.left;
      curY += shelfHeight + IMAGE_GAP;
      shelfHeight = 0;
    }

    // Check if shelf fits on current page
    if (curY + itemTotalHeight > A4.height - MARGINS.bottom && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      curX = MARGINS.left;
      curY = MARGINS.top;
      shelfHeight = 0;
    }

    currentPage.push({
      imageIndex: i,
      cellX: curX,
      cellY: curY,
      imgX: curX,
      imgY: curY,
      imgWidth: fit.width,
      imgHeight: fit.height,
      rotate: fit.rotate,
      captionX: curX,
      captionY: curY + fit.height,
      captionWidth: fit.width,
      topic: img.topic || null,
    });

    curX += fit.width + IMAGE_GAP;
    shelfHeight = Math.max(shelfHeight, itemTotalHeight);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Calculate optimal text layout for A4
 */
function calculateTextLayout(charCount, options = {}) {
  const { minFontSize = 9, maxFontSize = 12, targetPages = null } = options;
  const usableWidthPt = USABLE.width;
  const usableHeightPt = USABLE.height;

  let bestLayout = null;

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    const charWidth = fontSize * 0.5;
    const lineHeight = fontSize * 1.5;
    const charsPerLine = Math.floor(usableWidthPt / charWidth);
    const linesPerPage = Math.floor(usableHeightPt / lineHeight);
    const totalLines = Math.ceil(charCount / charsPerLine);
    const pagesNeeded = Math.ceil(totalLines / linesPerPage);

    if (targetPages === null || pagesNeeded <= targetPages) {
      bestLayout = {
        fontSize,
        lineHeight,
        charsPerLine,
        linesPerPage,
        pagesNeeded,
        margins: MARGINS,
      };
      break;
    }
  }

  return bestLayout || {
    fontSize: minFontSize,
    lineHeight: minFontSize * 1.5,
    charsPerLine: Math.floor(usableWidthPt / (minFontSize * 0.5)),
    linesPerPage: Math.floor(usableHeightPt / (minFontSize * 1.5)),
    pagesNeeded: Math.ceil(charCount / (Math.floor(usableWidthPt / (minFontSize * 0.5)) * Math.floor(usableHeightPt / (minFontSize * 1.5)))),
    margins: MARGINS,
  };
}

module.exports = {
  A4,
  MARGINS,
  USABLE,
  CAPTION_HEIGHT,
  IMAGE_GAP,
  PHOTO_SIZES,
  mmToPt,
  ptToMm,
  calculateGridLayout,
  fitImageInCell,
  generateImagePositions,
  calculateTextLayout,
};
