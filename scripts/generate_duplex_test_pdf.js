const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { splitForDuplex } = require('../src/services/docAnalyzer');

/**
 * Script to generate a comprehensive 4-page Duplex Print Test PDF
 * and split it into odd & even files for Canon PIXMA G3770.
 * Supports Portrait (default: long-edge flip) and Landscape (default: short-edge flip).
 */

function drawCrosshair(doc, x, y, label, isBottom = false) {
  const size = 10;
  doc.save();
  doc.lineWidth(0.5).strokeColor('#64748b');
  // horizontal line
  doc.moveTo(x - size, y).lineTo(x + size, y).stroke();
  // vertical line
  doc.moveTo(x, y - size).lineTo(x, y + size).stroke();
  // registration target circle
  doc.circle(x, y, 5).stroke();
  
  if (label) {
    doc.fontSize(6).font('Helvetica').fillColor('#94a3b8');
    const labelY = isBottom ? y - 10 : y + 6;
    const labelX = x > 300 ? x - 25 : x - 10;
    doc.text(label, labelX, labelY, { lineBreak: false });
  }
  doc.restore();
}

function drawOrientationArrow(doc, x, y, width, isTop) {
  doc.save();
  const text = isTop ? 'TOP OF PAGE (FEED DIRECTION FIRST)' : 'BOTTOM OF PAGE';
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
  doc.text(text, x, y, { width, align: 'center', lineBreak: false });
  
  // Vector arrow triangles
  const midX = x + width / 2;
  const arrowDist = 120;
  const leftX = midX - arrowDist;
  const rightX = midX + arrowDist;
  
  doc.fillColor('#475569');
  if (isTop) {
    // Arrow pointing UP
    doc.polygon([leftX, y], [leftX - 4, y + 8], [leftX + 4, y + 8]).fill();
    doc.polygon([rightX, y], [rightX - 4, y + 8], [rightX + 4, y + 8]).fill();
  } else {
    // Arrow pointing DOWN
    doc.polygon([leftX, y + 8], [leftX - 4, y], [leftX + 4, y]).fill();
    doc.polygon([rightX, y + 8], [rightX - 4, y], [rightX + 4, y]).fill();
  }
  
  // Subtle dashed reference line
  doc.lineWidth(0.5)
    .dash(4, { space: 4 })
    .strokeColor('#cbd5e1')
    .moveTo(x, y + (isTop ? 12 : -4))
    .lineTo(x + width, y + (isTop ? 12 : -4))
    .stroke()
    .undash();
    
  doc.restore();
}

function drawCalibrationBar(doc, x, y, width, isLandscape = false) {
  doc.save();
  const colors = [
    { name: 'Cyan', hex: '#00a8e8' },
    { name: 'Magenta', hex: '#e11d48' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Black', hex: '#0f172a' },
    { name: 'Gray 75%', hex: '#475569' },
    { name: 'Gray 50%', hex: '#94a3b8' },
    { name: 'Gray 25%', hex: '#cbd5e1' },
  ];
  
  const blockW = width / colors.length;
  const blockH = isLandscape ? 12 : 14;
  
  colors.forEach((c, idx) => {
    const bx = x + idx * blockW;
    doc.rect(bx, y, blockW, blockH).fill(c.hex);
    doc.fontSize(6).font('Helvetica-Bold').fillColor(idx >= 4 && idx <= 6 ? '#0f172a' : '#ffffff');
    doc.text(c.name, bx, y + 3, { width: blockW, align: 'center', lineBreak: false });
  });

  // Fine lines resolution ladder
  const ladderY = y + blockH + 4;
  doc.fontSize(6).font('Helvetica').fillColor('#64748b')
    .text('Resolution Test (0.25pt, 0.5pt, 0.75pt, 1pt, 1.5pt):', x, ladderY, { lineBreak: false });
  
  const lineWeights = [0.25, 0.5, 0.75, 1.0, 1.5];
  let lineX = x + 180;
  lineWeights.forEach(lw => {
    doc.lineWidth(lw).strokeColor('#0f172a');
    doc.moveTo(lineX, ladderY + 4).lineTo(lineX + 35, ladderY + 4).stroke();
    doc.fontSize(5).font('Helvetica').fillColor('#94a3b8')
      .text(`${lw}pt`, lineX, ladderY + 6, { width: 35, align: 'center', lineBreak: false });
    lineX += 45;
  });

  doc.restore();
}

function drawRuler(doc, x, y, cmCount = 10) {
  doc.save();
  doc.lineWidth(0.5).strokeColor('#64748b');
  const mmPt = 72 / 25.4; // 1mm in pt (~2.834pt)
  const totalW = cmCount * 10 * mmPt;
  
  doc.roundedRect(x, y, totalW + 20, 20, 3).fillAndStroke('#f8fafc', '#cbd5e1');
  
  const rulerStartX = x + 10;
  const baselineY = y + 15;
  doc.moveTo(rulerStartX, baselineY).lineTo(rulerStartX + totalW, baselineY).stroke();
  
  for (let mm = 0; mm <= cmCount * 10; mm++) {
    const tickX = rulerStartX + mm * mmPt;
    let tickHeight = 3;
    if (mm % 10 === 0) {
      tickHeight = 8;
      const cm = mm / 10;
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#475569')
        .text(`${cm}`, tickX - 5, baselineY - 13, { width: 10, align: 'center', lineBreak: false });
    } else if (mm % 5 === 0) {
      tickHeight = 5;
    }
    doc.moveTo(tickX, baselineY).lineTo(tickX, baselineY - tickHeight).stroke();
  }
  
  doc.fontSize(6).font('Helvetica').fillColor('#94a3b8')
    .text('10 cm Registration Ruler (check front-to-back overlap)', x + totalW + 28, y + 6, { lineBreak: false });
  doc.restore();
}

async function generateTestPdf(outputPath, options = {}) {
  const orientation = options.orientation || 'portrait';
  const isLandscape = orientation === 'landscape';
  const flipEdge = options.flipEdge || (isLandscape ? 'short-edge' : 'long-edge');

  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;

  const totalPages = options.pageCount || 4;
  const totalSheets = Math.ceil(totalPages / 2);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: orientation,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true,
      info: {
        Title: `Canon G3770 Duplex Print Test (${orientation})`,
        Author: 'MyPrinter Duplex System',
        Subject: `${totalPages}-Page Duplex Test - ${orientation.toUpperCase()} (${flipEdge})`,
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const flipInstructionPortrait = flipEdge === 'long-edge'
      ? 'Flip sheet horizontally along the long edge (like turning a book page). Top edge stays at TOP.'
      : 'Flip sheet vertically along the short edge (like flipping a notepad).';

    const flipInstructionLandscape = flipEdge === 'short-edge'
      ? 'Flip sheet horizontally along the short edge (booklet style). Top edge stays aligned.'
      : 'Flip sheet vertically along the long edge (calendar style).';

    const currentFlipInstruction = isLandscape ? flipInstructionLandscape : flipInstructionPortrait;

    const allPagesData = [
      {
        pageNum: 1,
        sheetNum: 1,
        side: 'FRONT',
        partnerPage: 2,
        primaryColor: '#2563eb', // Blue
        lightBg: '#eff6ff',
        passText: totalPages === 2 ? 'PASS 1 (Odd Page: 1)' : 'PASS 1 (Odd Pages: 1 & 3)',
        instruction: totalPages === 2
          ? `Print this in Pass 1. After printing: ${currentFlipInstruction} Re-insert into rear tray to print Page 2 on reverse.`
          : `Print this in Pass 1 along with Page 3. After printing: ${currentFlipInstruction} Re-insert into rear tray to print Page 2 on the reverse.`,
        checklist: null,
      },
      {
        pageNum: 2,
        sheetNum: 1,
        side: 'REVERSE / BACK',
        partnerPage: 1,
        primaryColor: '#1d4ed8', // Darker Blue
        lightBg: '#eff6ff',
        passText: totalPages === 2 ? 'PASS 2 (Even Page: 2)' : 'PASS 2 (Even Pages: 2 & 4)',
        instruction: 'Printed on the back of Sheet 1! The other side of this exact sheet is PAGE 1. When flipped on ' + (flipEdge === 'long-edge' ? 'long edge' : 'short edge') + ', both sides read right-side up.',
        checklist: totalPages === 2 ? [
          'Sheet 1: Front has Page 1 and Back has Page 2',
          `Properly aligned for ${orientation.toUpperCase()} (${flipEdge === 'long-edge' ? 'Long Edge / Left Sided' : 'Short Edge'})`,
          'Orientation: Page 2 is right-side up (180° rotation applied)',
          'Registration marks & 10cm ruler match through the paper within 1-2mm',
        ] : null,
      },
      {
        pageNum: 3,
        sheetNum: 2,
        side: 'FRONT',
        partnerPage: 4,
        primaryColor: '#059669', // Emerald
        lightBg: '#ecfdf5',
        passText: 'PASS 1 (Odd Pages: 1 & 3)',
        instruction: `Print this in Pass 1 along with Page 1. After printing: ${currentFlipInstruction} Re-insert into rear tray to print Page 4 on the reverse.`,
        checklist: null,
      },
      {
        pageNum: 4,
        sheetNum: 2,
        side: 'REVERSE / BACK',
        partnerPage: 3,
        primaryColor: '#047857', // Darker Emerald
        lightBg: '#ecfdf5',
        passText: 'PASS 2 (Even Pages: 2 & 4)',
        instruction: 'Printed on the back of Sheet 2! The other side of this exact sheet is PAGE 3.',
        checklist: [
          'Sheet 1: Front has Page 1 and Back has Page 2',
          'Sheet 2: Front has Page 3 and Back has Page 4',
          `Properly aligned for ${orientation.toUpperCase()} (${flipEdge === 'long-edge' ? 'Long Edge / Left Sided' : 'Short Edge'})`,
          'Registration marks & 10cm ruler match through the paper within 1-2mm',
        ],
      },
    ];

    const pagesData = allPagesData.slice(0, totalPages);

    pagesData.forEach((p, idx) => {
      if (idx > 0) {
        doc.addPage({ size: 'A4', layout: orientation, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      }

      const usableWidth = pageWidth - 64;
      const usableLeft = 32;

      // 1. Crosshairs at exact margins
      drawCrosshair(doc, 32, 32, '(32,32)', false);
      drawCrosshair(doc, pageWidth - 32, 32, `(${Math.round(pageWidth - 32)},32)`, false);
      drawCrosshair(doc, 32, pageHeight - 32, `(32,${Math.round(pageHeight - 32)})`, true);
      drawCrosshair(doc, pageWidth - 32, pageHeight - 32, `(${Math.round(pageWidth - 32)},${Math.round(pageHeight - 32)})`, true);

      // 2. Top Edge Indicator
      drawOrientationArrow(doc, usableLeft, isLandscape ? 36 : 42, usableWidth, true);

      // 3. Header Card
      const cardY = isLandscape ? 52 : 64;
      const cardH = isLandscape ? 40 : 48;
      doc.roundedRect(usableLeft, cardY, usableWidth, cardH, 6)
        .fillAndStroke(p.lightBg, p.primaryColor);

      // Header Tag Pill
      doc.roundedRect(usableLeft + 12, cardY + 8, 90, 15, 3).fill(p.primaryColor);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
        .text(`SHEET ${p.sheetNum} OF ${totalSheets}`, usableLeft + 12, cardY + 11.5, { width: 90, align: 'center', lineBreak: false });

      // Side Pill
      const sideBg = p.side.includes('FRONT') ? '#3b82f6' : '#6366f1';
      doc.roundedRect(usableLeft + 108, cardY + 8, 100, 15, 3).fill(sideBg);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
        .text(`${p.side} SIDE`, usableLeft + 108, cardY + 11.5, { width: 100, align: 'center', lineBreak: false });

      // Orientation & Binding Pill
      const bindLabel = `${orientation.toUpperCase()} • ${flipEdge === 'long-edge' ? 'FLIP LONG EDGE' : 'FLIP SHORT EDGE'}`;
      doc.roundedRect(usableLeft + 214, cardY + 8, 160, 15, 3).fill('#475569');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
        .text(bindLabel, usableLeft + 214, cardY + 11.5, { width: 160, align: 'center', lineBreak: false });

      // Pass info
      doc.fontSize(9).font('Helvetica-Bold').fillColor(p.primaryColor)
        .text(p.passText, usableLeft + usableWidth - 170, cardY + 10, { width: 160, align: 'right', lineBreak: false });

      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text('Canon PIXMA G3770 • Duplex Calibration Test', usableLeft + 12, cardY + 27, { lineBreak: false });
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, usableLeft + usableWidth - 180, cardY + 27, { width: 170, align: 'right', lineBreak: false });

      // 4. Main Page Hero Box
      const heroY = isLandscape ? 100 : 120;
      const heroHeight = isLandscape ? 135 : 190;
      doc.roundedRect(usableLeft, heroY, usableWidth, heroHeight, 8)
        .lineWidth(1.2)
        .strokeColor(p.primaryColor)
        .fill('#ffffff');

      // Decorative left accent
      doc.rect(usableLeft, heroY, 6, heroHeight).fill(p.primaryColor);

      // Large Page Number
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b')
        .text('DOCUMENT TEST PAGE', usableLeft + 22, heroY + (isLandscape ? 12 : 18), { lineBreak: false });

      doc.fontSize(isLandscape ? 54 : 70).font('Helvetica-Bold').fillColor(p.primaryColor)
        .text(`${p.pageNum}`, usableLeft + 22, heroY + (isLandscape ? 26 : 34), { lineBreak: false });

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b')
        .text(`OF ${totalPages} PAGES`, usableLeft + (isLandscape ? 95 : 130), heroY + (isLandscape ? 58 : 76), { lineBreak: false });

      // Physical Sheet Badge Box
      const badgeY = heroY + (isLandscape ? 82 : 120);
      const badgeH = isLandscape ? 45 : 56;
      doc.roundedRect(usableLeft + 22, badgeY, usableWidth - 44, badgeH, 5)
        .fillAndStroke(p.lightBg, '#cbd5e1');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(p.primaryColor)
        .text(`Physical Sheet #${p.sheetNum} • ${p.side} Side`, usableLeft + 30, badgeY + 6, { lineBreak: false });

      const relationText = p.side.includes('FRONT')
        ? `[>] When printed double-sided, the REVERSE side of this exact sheet will be PAGE ${p.partnerPage}.`
        : `[>] The FRONT side of this exact sheet is PAGE ${p.partnerPage}.`;
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155')
        .text(relationText, usableLeft + 30, badgeY + 18, { width: usableWidth - 60, lineBreak: false });

      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b')
        .text(p.instruction, usableLeft + 30, badgeY + 30, { width: usableWidth - 60, lineBreak: false });

      // 5. Duplex Guidance / Verification Card
      const guideY = isLandscape ? 245 : 320;
      const guideHeight = isLandscape ? (p.checklist ? 155 : 140) : (p.checklist ? 230 : 200);

      doc.roundedRect(usableLeft, guideY, usableWidth, guideHeight, 8)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text(p.checklist ? 'Duplex Print Verification & Checklist' : 'Manual Duplex Workflow Guide', usableLeft + 16, guideY + 10, { lineBreak: false });

      if (!p.checklist) {
        const steps = [
          {
            num: '1',
            title: totalPages === 2 ? 'Pass 1 (Odd Page: 1)' : 'Pass 1 (Odd Pages: 1 & 3)',
            desc: totalPages === 2 
              ? 'The printer feeds 1 blank sheet and prints Page 1. Sheet lands face-up in front output tray.'
              : 'The printer feeds blank sheets and prints Page 1 and Page 3. Sheets land face-up in front output tray.',
          },
          {
            num: '2',
            title: `Reloading (${orientation.toUpperCase()} • ${flipEdge === 'long-edge' ? 'Flip on Long Edge' : 'Flip on Short Edge'})`,
            desc: currentFlipInstruction,
          },
          {
            num: '3',
            title: totalPages === 2 ? 'Pass 2 (Even Page: 2)' : 'Pass 2 (Even Pages: 2 & 4)',
            desc: totalPages === 2
              ? 'The MyPrinter system prints Page 2 on Sheet 1 (back of Page 1) with 180° rotation for proper orientation!'
              : 'The MyPrinter system prints Page 2 on Sheet 1 (back of Page 1), then Page 4 on Sheet 2 (back of Page 3)!',
          },
        ];

        let stepY = guideY + 28;
        const stepSpacing = isLandscape ? 36 : 50;
        steps.forEach(st => {
          doc.circle(usableLeft + 24, stepY + 7, 8).fill(p.primaryColor);
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
            .text(st.num, usableLeft + 20, stepY + 3.5, { width: 8, align: 'center', lineBreak: false });

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b')
            .text(st.title, usableLeft + 38, stepY + 1, { lineBreak: false });

          doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
            .text(st.desc, usableLeft + 38, stepY + 14, { width: usableWidth - 55, lineBreak: false });

          stepY += stepSpacing;
        });
      } else {
        // Final checklist on Page 4
        doc.fontSize(8).font('Helvetica').fillColor('#334155')
          .text('Once you finish printing both passes, verify your results against this checklist:', usableLeft + 16, guideY + 26, { lineBreak: false });

        let checkY = guideY + 40;
        const checkSpacing = isLandscape ? 18 : 24;
        p.checklist.forEach(item => {
          doc.roundedRect(usableLeft + 16, checkY, 11, 11, 2).strokeColor(p.primaryColor).lineWidth(1).stroke();
          doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
            .text(item, usableLeft + 34, checkY + 1, { width: usableWidth - 50, lineBreak: false });
          checkY += checkSpacing;
        });

        // Success Callout Banner
        doc.roundedRect(usableLeft + 16, checkY + 4, usableWidth - 32, isLandscape ? 34 : 44, 4)
          .fillAndStroke('#ecfdf5', '#10b981');
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#065f46')
          .text('Duplex Print Verification Successful!', usableLeft + 24, checkY + 9, { lineBreak: false });
        const bannerDesc = totalPages === 2
          ? 'Sheet 1 matches front-to-back (Page 1 front, Page 2 back) and is aligned right-side up.'
          : 'Both sheets match front-to-back (1 & 2, 3 & 4) and are aligned in the correct orientation.';
        doc.fontSize(7).font('Helvetica').fillColor('#047857')
          .text(bannerDesc, usableLeft + 24, checkY + 21, { width: usableWidth - 48, lineBreak: false });
      }

      // 6. Color Calibration & Resolution Bar
      const calibY = isLandscape ? 412 : 560;
      drawCalibrationBar(doc, usableLeft, calibY, usableWidth, isLandscape);

      // 7. Metric Ruler (for front-to-back registration test)
      const rulerY = isLandscape ? 465 : 625;
      drawRuler(doc, usableLeft, rulerY, 10);

      // 8. Bottom Edge Indicator
      drawOrientationArrow(doc, usableLeft, pageHeight - (isLandscape ? 48 : 60), usableWidth, false);

      // 9. Footer
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
        .text(`MyPrinter Duplex Test • Page ${p.pageNum} of ${totalPages} • Sheet ${p.sheetNum} (${p.side}) • ${orientation.toUpperCase()}`, usableLeft, pageHeight - (isLandscape ? 20 : 26), { width: usableWidth, align: 'center', lineBreak: false });
    });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// Execute if run directly
async function main() {
  const outputDir = path.join(__dirname, '../public/test_docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const orientation = process.argv[2] || 'portrait';
  const flipEdge = process.argv[3] || (orientation === 'landscape' ? 'short-edge' : 'long-edge');
  const pageCount = parseInt(process.argv[4], 10) || 4;

  const masterPdfPath = path.join(outputDir, `duplex_test_${pageCount}pages.pdf`);
  console.log(`[DuplexTest] Generating master ${pageCount}-page test PDF (${orientation}, ${flipEdge}) at: ${masterPdfPath}`);
  
  await generateTestPdf(masterPdfPath, { orientation, flipEdge, pageCount });
  console.log('[DuplexTest] Master PDF generated successfully!');

  // Run duplex splitting with normal even order
  const splitDir = path.join(outputDir, 'duplex_split');
  if (!fs.existsSync(splitDir)) {
    fs.mkdirSync(splitDir, { recursive: true });
  }

  console.log(`[DuplexTest] Splitting PDF for manual duplex printing into: ${splitDir}`);
  const result = await splitForDuplex(masterPdfPath, splitDir, {
    orientation,
    flipEdge,
    evenOrder: 'normal',
  });
  console.log(`[DuplexTest] Split complete:`);
  console.log(`  - Odd pages: ${result.oddPath} (${result.oddPageCount} pages)`);
  console.log(`  - Even pages: ${result.evenPath} (${result.evenPageCount} pages, ordered in normal feed order)`);
  console.log('\nDuplex print instructions:');
  result.instructions.forEach(ins => console.log(`  ${ins}`));
}

if (require.main === module) {
  main().catch(err => {
    console.error('[DuplexTest] Error:', err);
    process.exit(1);
  });
}

module.exports = { generateTestPdf };
