/**
 * TxtToDoc — System B Frontend
 * Text input, enhancement, and PDF generation with full Both-Side (Duplex) Printing support
 */
window.TxtToDoc = (() => {
  let sessionId = null;
  let enhancedText = '';
  let mode = 'bw';
  let printSides = 'duplex'; // 'duplex' (both sides) or 'single'
  let orientation = 'portrait';
  let flipEdge = 'long-edge';
  let currentDocData = null;
  let pass1Printed = false;
  let pass2Printed = false;

  async function init() {
    const data = await window.MyPrinter.api('/api/txttodoc/session', { method: 'POST' });
    sessionId = data.sessionId;
    window.MyPrinter.currentSession = sessionId;
    currentDocData = null;
    pass1Printed = false;
    pass2Printed = false;
    render();
  }

  function render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="system-page">
        <div class="system-header">
          <button class="btn-back" onclick="window.MyPrinter.navigateHome()">←</button>
          <div>
            <div class="system-title">📝 TxtToDoc</div>
            <div class="system-subtitle">Enhance text, format layout, and print single or both-sided (duplex) on Canon G3770</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid var(--border-medium); padding:4px 10px; border-radius:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
              <span>📁</span>
              <span>Session: <b style="color:#c4b5fd;">${sessionId || "Initializing..."}</b></span>
            </div>

            <!-- Print Sides Toggle -->
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${printSides === 'single' ? 'active' : ''}" onclick="window.TxtToDoc.setPrintSides('single')" title="Single-sided printing">
                📄 Single-Sided
              </button>
              <button class="mode-toggle-btn ${printSides === 'duplex' ? 'active' : ''}" onclick="window.TxtToDoc.setPrintSides('duplex')" title="Two-sided (duplex) printing">
                📖 Both Sides (Duplex)
              </button>
            </div>

            <!-- Color Mode Toggle -->
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${mode === 'bw' ? 'active' : ''}" onclick="window.TxtToDoc.setMode('bw')" title="Black & White (Ink Saver)">
                ⬛ B/W
              </button>
              <button class="mode-toggle-btn ${mode === 'color' ? 'active' : ''}" onclick="window.TxtToDoc.setMode('color')" title="Color">
                🎨 Color
              </button>
            </div>
          </div>
        </div>

        <!-- Step 1: Input Text -->
        <div class="step-container active" id="step-input">
          <div class="step-label">
            <div class="step-number">1</div>
            <div class="step-title">Enter Your Text & Printing Options</div>
          </div>

          <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">
              Type or paste your text below. You can also load ready-made sample documents to test both-side printing:
            </span>
            <div style="display:flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.loadSample(2)" style="font-size:0.75rem; padding:4px 10px;">
                ⚡ 2-Page Sample (1 Sheet Duplex)
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.loadSample(4)" style="font-size:0.75rem; padding:4px 10px;">
                ⚡ 4-Page Sample (2 Sheets Duplex)
              </button>
            </div>
          </div>

          <div class="form-group">
            <textarea class="form-textarea" id="raw-text" rows="11" 
                      placeholder="Paste or type your text here. It will be enhanced, structured, and formatted for optimal A4 printing with minimal ink and full both-side (duplex) support..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Font Size</label>
              <select class="form-select" id="font-size">
                <option value="9">9pt (Compact - more text per page)</option>
                <option value="10">10pt (Small)</option>
                <option value="11" selected>11pt (Standard)</option>
                <option value="12">12pt (Large)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Print Sides Mode</label>
              <select class="form-select" id="select-print-sides" onchange="window.TxtToDoc.setPrintSides(this.value)">
                <option value="duplex" ${printSides === 'duplex' ? 'selected' : ''}>📖 Both Sides (Duplex — 50% Paper Saved)</option>
                <option value="single" ${printSides === 'single' ? 'selected' : ''}>📄 Single-Sided (One side per sheet)</option>
              </select>
            </div>

            <div class="form-group" id="group-flip-edge" style="${printSides === 'duplex' ? '' : 'display:none;'}">
              <label class="form-label">Duplex Flip Edge</label>
              <select class="form-select" id="select-flip-edge" onchange="window.TxtToDoc.setFlipEdge(this.value)">
                <option value="long-edge" ${flipEdge === 'long-edge' ? 'selected' : ''}>📖 Long Edge (Standard book / left binding)</option>
                <option value="short-edge" ${flipEdge === 'short-edge' ? 'selected' : ''}>📋 Short Edge (Top flip / calendar / notepad)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Orientation</label>
              <select class="form-select" id="select-orientation" onchange="window.TxtToDoc.setOrientation(this.value)">
                <option value="portrait" ${orientation === 'portrait' ? 'selected' : ''}>📄 Portrait</option>
                <option value="landscape" ${orientation === 'landscape' ? 'selected' : ''}>🖼️ Landscape</option>
              </select>
            </div>
          </div>

          <div style="display:flex; gap: var(--space-sm); margin-top: 10px;">
            <button class="btn btn-secondary" onclick="window.TxtToDoc.enhance()">
              ✨ Enhance & Clean Text
            </button>
            <button class="btn btn-primary" onclick="window.TxtToDoc.generate()">
              📄 Generate PDF Document
            </button>
          </div>
        </div>

        <!-- Step 2: Enhanced Preview -->
        <div class="step-container" id="step-preview" style="display:none">
          <div class="step-label">
            <div class="step-number">2</div>
            <div class="step-title">Enhanced Text Preview</div>
          </div>
          <div class="result-stats" id="text-stats"></div>
          <div class="form-group">
            <textarea class="form-textarea" id="enhanced-text" rows="11" 
                      placeholder="Enhanced text will appear here..."></textarea>
          </div>
          <button class="btn btn-primary btn-lg btn-full" onclick="window.TxtToDoc.generate()" id="btn-gen-txt">
            📄 Generate Print-Ready PDF
          </button>
        </div>

        <!-- Step 3: Result -->
        <div id="step-result" style="display:none"></div>
      </div>
    `;

    if (currentDocData) {
      renderResult();
    }
  }

  function setMode(m) {
    mode = m;
    render();
  }

  function setPrintSides(sides) {
    printSides = sides;
    const flipGroup = document.getElementById('group-flip-edge');
    if (flipGroup) {
      flipGroup.style.display = sides === 'duplex' ? 'block' : 'none';
    }
    const select = document.getElementById('select-print-sides');
    if (select) select.value = sides;

    if (currentDocData) {
      renderResult();
    } else {
      render();
    }
  }

  async function setOrientation(o) {
    orientation = o;
    if (orientation === 'landscape') {
      flipEdge = 'short-edge';
    } else {
      flipEdge = 'long-edge';
    }

    if (currentDocData) {
      await updateDuplexSplit();
    } else {
      render();
    }
  }

  async function setFlipEdge(f) {
    flipEdge = f;
    if (currentDocData) {
      await updateDuplexSplit();
    } else {
      render();
    }
  }

  async function updateDuplexSplit() {
    if (!sessionId) return;
    window.MyPrinter.showLoading('Updating duplex configuration...');
    try {
      const data = await window.MyPrinter.api('/api/txttodoc/duplex-split', {
        method: 'POST',
        body: { sessionId, orientation, flipEdge },
      });
      if (currentDocData) {
        currentDocData.duplex = data.duplex;
        currentDocData.analysis = data.analysis;
        currentDocData.pageCount = data.pageCount;
      }
      pass1Printed = false;
      pass2Printed = false;
      renderResult();
      window.MyPrinter.showToast('Duplex settings updated!', 'success');
    } catch (e) {
      window.MyPrinter.showToast('Failed to update duplex: ' + e.message, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  async function enhance() {
    const rawText = document.getElementById('raw-text')?.value.trim();
    if (!rawText) {
      window.MyPrinter.showToast('Please enter some text', 'warning');
      return;
    }

    window.MyPrinter.showLoading('Enhancing text...');
    try {
      const data = await window.MyPrinter.api('/api/txttodoc/enhance', {
        method: 'POST',
        body: { text: rawText, sessionId },
      });

      enhancedText = data.enhanced;
      
      const previewStep = document.getElementById('step-preview');
      previewStep.style.display = 'block';
      document.getElementById('enhanced-text').value = enhancedText;
      
      // Show stats
      const stats = data.stats;
      document.getElementById('text-stats').innerHTML = `
        <div class="stat-item">
          <div class="stat-value">${stats.words}</div>
          <div class="stat-label">Words</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.paragraphs}</div>
          <div class="stat-label">Paragraphs</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.sentences}</div>
          <div class="stat-label">Sentences</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">~${stats.estimatedReadingTime}m</div>
          <div class="stat-label">Read Time</div>
        </div>
      `;

      window.MyPrinter.showToast('Text enhanced successfully!', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Enhancement failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  async function generate() {
    let text = '';
    const enhancedEl = document.getElementById('enhanced-text');
    const rawEl = document.getElementById('raw-text');
    
    if (enhancedEl && enhancedEl.value.trim()) {
      text = enhancedEl.value.trim();
    } else if (rawEl && rawEl.value.trim()) {
      text = rawEl.value.trim();
    }

    if (!text) {
      window.MyPrinter.showToast('Please enter some text first', 'warning');
      return;
    }

    const fontSize = parseInt(document.getElementById('font-size')?.value) || 11;

    window.MyPrinter.showLoading('Generating document & calculating duplex layout...');
    try {
      const data = await window.MyPrinter.api('/api/txttodoc/generate', {
        method: 'POST',
        body: { 
          sessionId, 
          text, 
          mode, 
          fontSize,
          orientation,
          flipEdge,
        },
      });

      currentDocData = data;
      pass1Printed = false;
      pass2Printed = false;

      renderResult();
      window.MyPrinter.showToast(`Document generated (${data.pageCount} page${data.pageCount > 1 ? 's' : ''})!`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Generation failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  function renderResult() {
    const resultDiv = document.getElementById('step-result');
    if (!resultDiv || !currentDocData) return;

    resultDiv.style.display = 'block';

    const pageCount = currentDocData.pageCount || 1;
    const isDuplex = printSides === 'duplex';
    const sheetsNeeded = Math.ceil(pageCount / 2);
    const pagesLabel = pageCount === 1 
      ? '1 Page' 
      : (isDuplex ? `${pageCount} Pages (${sheetsNeeded} sheet${sheetsNeeded > 1 ? 's' : ''} duplex)` : `${pageCount} Pages (${pageCount} sheets single)`);

    const oddPagesLabel = currentDocData.duplex.oddPageCount === 1 ? 'Page 1' : 'Pages 1 & 3';
    const evenPagesLabel = currentDocData.duplex.evenPageCount === 1 ? 'Page 2' : 'Pages 2 & 4';

    let printSectionHtml = '';

    if (!isDuplex) {
      // Single-Sided Mode
      printSectionHtml = `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 18px; margin-top: var(--space-md);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
            <div>
              <h4 style="margin:0; font-size: 1rem; color: var(--text-primary);">📄 Single-Sided Printing</h4>
              <p style="margin: 2px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                Will print all ${pageCount} page${pageCount > 1 ? 's' : ''} on separate sheets.
              </p>
            </div>
            ${pageCount > 1 ? `
              <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.setPrintSides('duplex')">
                📖 Switch to Both Sides (Duplex)
              </button>
            ` : ''}
          </div>
          <div style="display:flex; gap: var(--space-sm); flex-wrap: wrap;">
            <a href="${currentDocData.pdfUrl}" download="text_document.pdf" class="btn btn-secondary">
              ⬇ Download PDF
            </a>
            <button class="btn btn-success btn-lg" onclick="window.TxtToDoc.printSingle()" style="flex:1">
              🖨️ Print Single-Sided (${pageCount} page${pageCount > 1 ? 's' : ''})
            </button>
            ${pageCount > 1 ? `
              <button class="btn btn-primary" onclick="window.TxtToDoc.openInDuplexPrint()" title="Open in DuplexPrint Studio">
                ⚡ Open in DuplexPrint
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      // Both Sides (Duplex) Mode
      if (pageCount === 1) {
        // Only 1 page
        printSectionHtml = `
          <div style="background: rgba(59, 130, 246, 0.08); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 10px; padding: 18px; margin-top: var(--space-md);">
            <div style="display:flex; align-items:flex-start; gap: 10px; margin-bottom: 12px;">
              <span style="font-size: 1.4rem;">💡</span>
              <div>
                <h4 style="margin:0; font-size: 1rem; color: var(--text-primary);">Single Page Document (1 Side Required)</h4>
                <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                  This text fits cleanly on <b>1 page</b> (1 side of an A4 sheet). Both-side printing activates automatically when your text spans 2 or more pages.
                </p>
              </div>
            </div>
            <div style="display:flex; gap: var(--space-sm); flex-wrap: wrap;">
              <a href="${currentDocData.pdfUrl}" download="text_document.pdf" class="btn btn-secondary">
                ⬇ Download PDF
              </a>
              <button class="btn btn-success btn-lg" onclick="window.TxtToDoc.printSingle()" style="flex:1">
                🖨️ Print Page 1
              </button>
              <button class="btn btn-secondary" onclick="window.TxtToDoc.loadSample(2)">
                ⚡ Try 2-Page Sample (Test Both Sides)
              </button>
            </div>
          </div>
        `;
      } else {
        // Multi-page document with full duplex workflow!
        const flipInstruction = orientation === 'portrait'
          ? (flipEdge === 'long-edge'
              ? `1. Collect the printed sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} from the front output tray.<br>2. <b>Flip horizontally along the long edge</b> (like turning the page of a book).<br>3. Keep top edge facing UP.<br>4. Re-insert into rear paper tray with the blank side facing YOU.`
              : `1. Collect the printed sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} from the front output tray.<br>2. <b>Flip vertically along the short edge</b> (like flipping a notepad).<br>3. Re-insert into rear paper tray with the blank side facing YOU.`)
          : (flipEdge === 'short-edge'
              ? `1. Collect the printed sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} from the front output tray.<br>2. <b>Flip horizontally along the short edge</b> (like turning a booklet or calendar).<br>3. Re-insert into rear paper tray with the blank side facing YOU.`
              : `1. Collect the printed sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} from the front output tray.<br>2. <b>Flip vertically along the long edge</b>.<br>3. Re-insert into rear paper tray with the blank side facing YOU.`);

        let duplexControlsHtml = '';

        if (!pass1Printed) {
          // Phase 1: Ready to print fronts
          duplexControlsHtml = `
            <div style="display:flex; gap: var(--space-md); flex-wrap:wrap; margin-top: 14px;">
              <div style="flex:1; min-width: 280px;">
                <div class="result-card" style="border-top: 3px solid #2563eb; margin-top:0;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--space-sm);">
                    <h4 style="margin:0; font-size:1rem; color:var(--text-primary);">Phase 1: Print Front Sides (Odd Pages)</h4>
                    <span style="font-size:0.75rem; background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:10px; font-weight:600;">${oddPagesLabel}</span>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                    Load <b>${currentDocData.duplex.oddPageCount} blank A4 sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''}</b> into the Canon G3770 rear tray. Mode: <b>${mode.toUpperCase()}</b>.
                  </p>
                  <div style="display:flex; gap: var(--space-sm); align-items:center; flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="window.TxtToDoc.printPass1()">
                      🖨️ Print Pass 1 (${oddPagesLabel})
                    </button>
                    <a href="${currentDocData.duplex.oddUrl}" target="_blank" class="btn btn-secondary btn-sm">👁️ Preview Odd Pages</a>
                  </div>
                </div>
              </div>
              <div style="flex:1; min-width: 280px; opacity: 0.55;">
                <div class="result-card" style="border-top: 3px solid #94a3b8; margin-top:0;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--space-sm);">
                    <h4 style="margin:0; font-size:1rem; color:#64748b;">Phase 2: Print Back Sides</h4>
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.06); color:#94a3b8; padding:2px 8px; border-radius:10px;">Waiting for Pass 1</span>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                    This step will unlock after Pass 1 prints and you confirm paper reloading.
                  </p>
                </div>
              </div>
            </div>
          `;
        } else if (pass1Printed && !pass2Printed) {
          // Phase 2: Reload confirmation
          duplexControlsHtml = `
            <div style="background: rgba(245, 158, 11, 0.08); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-top: 14px;">
              <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 12px;">
                <div style="font-size: 1.8rem; line-height: 1;">🔄</div>
                <div>
                  <h3 style="margin:0; font-size: 1.15rem; color: #f59e0b;">Pass 1 Complete — Reload Paper Before Pass 2!</h3>
                  <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                    ${oddPagesLabel} printed. Please reload the sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} following the instructions below:
                  </p>
                </div>
              </div>

              <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 14px 18px; margin: 12px 0;">
                <div style="font-weight: 700; font-size: 0.9rem; color: #f59e0b; margin-bottom: 6px;">
                  📋 Exact Reloading Guide (${orientation.toUpperCase()} • ${flipEdge === 'long-edge' ? 'Flip on Long Edge / Left Sided' : 'Flip on Short Edge'}):
                </div>
                <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-primary);">
                  ${flipInstruction}
                </div>
              </div>

              <div style="display:flex; gap: 12px; align-items:center; flex-wrap:wrap; margin-top: 16px;">
                <button class="btn btn-success btn-lg" onclick="window.TxtToDoc.confirmReloadAndPrintPass2()" style="font-weight: 700; padding: 12px 24px; font-size: 1rem;">
                  ✅ Yes, I Have Re-inserted the Sheet${currentDocData.duplex.oddPageCount > 1 ? 's' : ''} — Print Pass 2 (${evenPagesLabel})
                </button>
                <a href="${currentDocData.duplex.evenUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px;">
                  👁️ Preview Pass 2
                </a>
                <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.printPass1()">
                  🔄 Re-print Pass 1 (if misfed)
                </button>
              </div>
            </div>
          `;
        } else {
          // Completed
          duplexControlsHtml = `
            <div style="background: rgba(16, 185, 129, 0.08); border: 2px solid #10b981; border-radius: 12px; padding: 22px; text-align: center; margin-top: 14px;">
              <div style="font-size: 2.2rem; margin-bottom: 8px;">🎉</div>
              <h3 style="margin:0 0 6px; font-size: 1.25rem; color: #10b981;">Both Sides Printed Successfully!</h3>
              <p style="margin: 0 auto 16px; max-width: 500px; font-size: 0.88rem; color: var(--text-secondary);">
                Double-sided document is ready! Sheet 1 contains Page 1 (Front) / Page 2 (Back)${pageCount > 2 ? ', Sheet 2 contains Page 3 / Page 4' : ''}.
              </p>
              <div style="display:flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="window.TxtToDoc.resetDuplexPrint()">
                  🔄 Print Both Sides Again
                </button>
                <button class="btn btn-secondary" onclick="window.TxtToDoc.openInDuplexPrint()">
                  ⚡ Open in DuplexPrint Studio
                </button>
              </div>
            </div>
          `;
        }

        printSectionHtml = `
          <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 18px; margin-top: var(--space-md);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
              <div style="display:flex; align-items:center; gap: 8px;">
                <span style="font-size: 1.2rem;">📖</span>
                <div>
                  <h4 style="margin:0; font-size: 1rem; color: var(--text-primary);">Both-Sided (Duplex) Print Controls</h4>
                  <span style="font-size: 0.8rem; color: #10b981; font-weight: 600;">
                    ${sheetsNeeded} sheet${sheetsNeeded > 1 ? 's' : ''} of A4 required • Saves 50% paper
                  </span>
                </div>
              </div>
              <div style="display:flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <span style="font-size:0.8rem; color:var(--text-secondary);">Flip:</span>
                <select class="form-select form-select-sm" style="width:auto; padding:4px 8px; font-size:0.75rem;" onchange="window.TxtToDoc.setFlipEdge(this.value)">
                  <option value="long-edge" ${flipEdge === 'long-edge' ? 'selected' : ''}>📖 Long Edge</option>
                  <option value="short-edge" ${flipEdge === 'short-edge' ? 'selected' : ''}>📋 Short Edge</option>
                </select>
                <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.setPrintSides('single')">
                  Switch to Single-Sided
                </button>
              </div>
            </div>

            <!-- Analysis breakdown badges -->
            <div style="display:flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
              <span style="background:rgba(255,255,255,0.06); border:1px solid var(--border-subtle); padding:4px 10px; border-radius:12px; font-size:0.8rem;">
                Fronts (Pass 1): <b>${oddPagesLabel}</b>
              </span>
              <span style="background:rgba(255,255,255,0.06); border:1px solid var(--border-subtle); padding:4px 10px; border-radius:12px; font-size:0.8rem;">
                Backs (Pass 2): <b>${evenPagesLabel}</b>
              </span>
              <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:12px; font-size:0.8rem;">
                Sheets: <b>${sheetsNeeded} sheet${sheetsNeeded > 1 ? 's' : ''}</b>
              </span>
            </div>

            ${duplexControlsHtml}

            <!-- Bottom utility actions -->
            <div style="margin-top: 16px; pt-top: 12px; border-top: 1px solid var(--border-subtle); display:flex; gap: var(--space-sm); flex-wrap: wrap;">
              <a href="${currentDocData.pdfUrl}" download="text_document.pdf" class="btn btn-secondary btn-sm">
                ⬇ Download Master PDF
              </a>
              <a href="${currentDocData.duplex.oddUrl}" download="odd_pages.pdf" class="btn btn-secondary btn-sm">
                ⬇ Download Odd Pages
              </a>
              <a href="${currentDocData.duplex.evenUrl}" download="even_pages.pdf" class="btn btn-secondary btn-sm">
                ⬇ Download Even Pages
              </a>
              <button class="btn btn-secondary btn-sm" onclick="window.TxtToDoc.openInDuplexPrint()" style="margin-left:auto;">
                ⚡ Open in DuplexPrint Studio →
              </button>
            </div>
          </div>
        `;
      }
    }

    resultDiv.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <div class="result-title">
            <span>✅</span>
            <span>Text Document Generated</span>
            <span style="margin-left: 8px; font-size: 0.75rem; background: ${isDuplex ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${isDuplex ? '#10b981' : '#60a5fa'}; padding: 2px 10px; border-radius: 12px; font-weight:600;">
              ${isDuplex ? '📖 Both Sides (Duplex)' : '📄 Single-Sided'}
            </span>
          </div>
        </div>

        <div class="result-stats">
          <div class="stat-item">
            <div class="stat-value">${currentDocData.textStats.words}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${pageCount}</div>
            <div class="stat-label">${pagesLabel}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${window.MyPrinter.formatSize(currentDocData.fileSize)}</div>
            <div class="stat-label">File Size</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${mode === 'bw' ? '⬛ B/W' : '🎨 Color'}</div>
            <div class="stat-label">Print Mode</div>
          </div>
        </div>

        <div class="pdf-preview">
          <iframe src="${currentDocData.pdfUrl}" title="PDF Preview"></iframe>
        </div>

        ${printSectionHtml}
      </div>
    `;

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function printPass1() {
    if (!sessionId) return;
    window.MyPrinter.showLoading('Sending Pass 1 (Front Sides / Odd Pages) to Canon G3770...');
    try {
      const data = await window.MyPrinter.api('/api/txttodoc/print-duplex', {
        method: 'POST',
        body: {
          sessionId,
          pageSet: 'odd',
          mode: mode === 'bw' ? 'bw' : 'color',
          orientation,
        },
      });
      pass1Printed = true;
      renderResult();
      window.MyPrinter.showToast('Pass 1 printed! Please follow reload instructions.', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Pass 1 print failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  async function confirmReloadAndPrintPass2() {
    if (!sessionId) return;
    window.MyPrinter.showLoading('Sending Pass 2 (Back Sides / Even Pages) to Canon G3770...');
    try {
      const data = await window.MyPrinter.api('/api/txttodoc/print-duplex', {
        method: 'POST',
        body: {
          sessionId,
          pageSet: 'even',
          mode: mode === 'bw' ? 'bw' : 'color',
          orientation,
        },
      });
      pass2Printed = true;
      renderResult();
      window.MyPrinter.showToast('Pass 2 printed! Double-sided printing complete.', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Pass 2 print failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  async function printSingle() {
    if (!sessionId) return;
    window.MyPrinter.showLoading('Sending document to printer...');
    try {
      const data = await window.MyPrinter.api('/api/printer/print', {
        method: 'POST',
        body: { 
          sessionId, 
          filename: 'text_document.pdf', 
          system: 'txttodoc', 
          mode: mode === 'bw' ? 'bw' : 'color' 
        },
      });
      window.MyPrinter.showToast(`Print job sent! ${data.message}`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Print failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  function resetDuplexPrint() {
    pass1Printed = false;
    pass2Printed = false;
    renderResult();
  }

  async function openInDuplexPrint() {
    if (!sessionId) return;
    window.MyPrinter.showLoading('Transferring to DuplexPrint Studio...');
    try {
      const data = await window.MyPrinter.api('/api/duplexprint/from-session', {
        method: 'POST',
        body: {
          sourceSessionId: sessionId,
          filename: 'text_document.pdf',
          orientation,
          flipEdge,
        },
      });
      window.MyPrinter.navigateTo('duplexprint');
      if (window.DuplexPrint && window.DuplexPrint.loadExistingDuplexData) {
        window.DuplexPrint.loadExistingDuplexData(data);
      }
      window.MyPrinter.showToast('Loaded in DuplexPrint Studio!', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Could not open in DuplexPrint: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  function loadSample(pageTarget = 2) {
    const rawEl = document.getElementById('raw-text');
    if (!rawEl) return;

    if (pageTarget === 2) {
      rawEl.value = `Comprehensive Guide to Two-Sided (Duplex) Printing

Introduction to Duplex Printing
Two-sided printing, also known as duplex printing, is one of the most effective and eco-friendly features in modern document management. By printing on both the front and back of each sheet of paper, you cut your total paper usage by 50 percent, reduce document thickness, and create professional book-style or report-style bindings.

For manual duplex printers like the Canon PIXMA G3770, two-sided printing is achieved through a precise two-pass process. In the first pass, all odd-numbered pages (1, 3, 5, etc.) are printed on the front side of each sheet. Once this batch is complete, the printed sheets are collected from the front output tray, oriented correctly, and reloaded into the rear paper tray. The printer then performs the second pass, printing all even-numbered pages (2, 4, 6, etc.) on the blank reverse side.

Understanding Page Orientation and Flip Edges
When printing double-sided documents, choosing the right flip edge is essential to ensure that both sides of the printed sheet face upright:

1. Long Edge Flipping (Standard Book Style):
When printing in Portrait orientation, flipping along the long edge simulates turning the page of a book or magazine. The reader flips the page from right to left. To maintain proper alignment on the rear-tray feed mechanism, the back page is automatically rotated by 180 degrees so that both pages appear upright when bound along the left margin.

2. Short Edge Flipping (Calendar or Notepad Style):
When printing in Landscape orientation or for top-bound documents (such as legal pads, flip charts, or calendars), flipping along the short edge allows the user to turn pages upwards. The top of the front page aligns with the top of the reverse page.

Optimizing Text and Ink Usage for Print
A document prepared for print must balance readability and ink efficiency. Using clean standard typefaces like Helvetica or Arial ensures maximum legibility at compact point sizes (10pt to 11pt). Headings should be clearly defined without excessive heavy black fills that soak through standard 75 to 80 GSM copy paper.

By combining text formatting with manual duplex printing, MyPrinter provides a complete studio-grade printing workflow directly to your Canon PIXMA G3770 printer over Wi-Fi.

Best Practices for Paper Handling
- Ensure that the sheets collected from Pass 1 are neatly squared before re-inserting them into the rear tray.
- Allow freshly printed inkjet pages 10 to 15 seconds to dry to prevent paper curl or feed jams.
- Follow the visual on-screen reload guide closely for flawless orientation every time.`;
    } else {
      rawEl.value = `The Complete Manual of Smart Printing & Document Architecture

Chapter 1: Principles of Inkjet Engineering and Ink Optimization
Modern ink-tank printers like the Canon PIXMA G3770 have revolutionized personal and office printing by replacing costly disposable cartridges with high-capacity integrated ink reservoirs. However, high tank capacity does not eliminate the need for intelligent ink conservation. Effective document preparation begins with digital typography and layout optimization.

Standard office printing frequently consumes excessive ink due to non-optimized rich black colors, full-saturation images, and unnecessarily large margins. In digital workflows, true black text formatted in pure grayscale requires significantly less composite pigment than RGB rich blacks. By filtering text through an ink-efficiency engine, font weights and spacing are balanced to ensure maximum legibility while minimizing surface droplet density.

Chapter 2: Structural A4 Layout Engineering
The international A4 paper standard measures exactly 210 millimeters by 297 millimeters, equivalent to 595.28 points by 841.89 points in typographic measurement. Designing documents specifically for this ratio ensures that white space is utilized effectively without wasteful over-margining.

When structuring long-form text documents, standard margin reservations of 5 millimeters to 10 millimeters along the edges provide ample gripper clearance for hardware paper feed rollers while maximizing the usable content canvas. Combining this with proportional line spacing of 1.2 to 1.4 times font size yields documents that are effortless to read and compact in physical volume.

Chapter 3: Two-Sided Printing Mechanics and Paper Economy
Paper production requires substantial water, energy, and timber resources. Switching from simplex (single-sided) printing to duplex (two-sided) printing immediately reduces raw paper consumption by 50 percent. For multi-page publications, manuals, and study guides, duplex printing also halves the physical bulk of the document stack, making filing and transport far more convenient.

In manual duplex printing systems, software coordination is critical. The host computer splits the compiled document into two independent print queues: an odd-page queue containing front sides and an even-page queue containing back sides. Because inkjet printers feed paper from top to bottom, flipping the paper stack across its vertical or horizontal axis requires a geometric rotation of 180 degrees on even pages to preserve reading orientation.

Chapter 4: Calibration, Registration, and Feed Consistency
Ensuring that front and back pages register accurately requires consistent paper feed tension. When paper passes through an inkjet print engine, microscopic moisture absorption from water-based dye inks can cause slight paper expansion. High-quality document layout engines compensate for this by maintaining identical active margins across odd and even pages.

For bound volumes, leaving an additional 2 millimeters along the binding edge ensures that hole punches, staples, or spiral coils do not obscure critical text. By following systematic verification steps, users can achieve commercial-grade double-sided booklets from an affordable desktop printer.

Chapter 5: Network Printing over CUPS and Internet Printing Protocol
The Canon G3770 features built-in 802.11 b/g/n Wi-Fi connectivity, allowing seamless submission of rasterized print jobs via Apple CUPS (Common Unix Printing System) and IPP (Internet Printing Protocol). Print commands sent via the standard command line or web application bypass proprietary driver dialogs, communicating directly with the printer daemon.

Through this direct integration, attributes such as PageSize=A4, ColorModel=Gray, and cupsPrintQuality=Normal are applied programmatically, eliminating user configuration errors and ensuring repeatable, high-fidelity output on every run.`;
    }

    window.MyPrinter.showToast(`Loaded ${pageTarget}-page sample text! Ready to generate.`, 'info');
  }

  return { 
    init, 
    enhance, 
    generate, 
    printSingle,
    printPass1,
    confirmReloadAndPrintPass2,
    resetDuplexPrint,
    setMode,
    setPrintSides,
    setOrientation,
    setFlipEdge,
    openInDuplexPrint,
    loadSample
  };
})();
