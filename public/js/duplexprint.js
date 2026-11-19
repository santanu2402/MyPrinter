/**
 * DuplexPrint — System C Frontend
 * Manual two-sided printing for Canon G3770
 * Supports B/W & Color, Portrait & Landscape, Long-Edge & Short-Edge flipping,
 * and a guided 2-phase reload confirmation flow.
 */
window.DuplexPrint = (() => {
  let sessionId = null;
  let duplexData = null;
  let mode = 'bw'; // Default B/W
  let orientation = 'portrait'; // Default Portrait
  let flipEdge = 'long-edge'; // Default Long Edge for Portrait
  let pass1Printed = false;
  let pass2Printed = false;

  async function init() {
    const data = await window.MyPrinter.api('/api/duplexprint/session', { method: 'POST' });
    sessionId = data.sessionId;
    window.MyPrinter.currentSession = sessionId;
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
            <div class="system-title">📄 DuplexPrint</div>
            <div class="system-subtitle">Manual two-sided printing for Canon G3770</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid var(--border-medium); padding:4px 10px; border-radius:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
              <span>📁</span>
              <span>Session: <b style="color:#c4b5fd;">${sessionId || "Initializing..."}</b></span>
            </div>

            <!-- Orientation Selector -->
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${orientation === 'portrait' ? 'active' : ''}" onclick="window.DuplexPrint.setOrientation('portrait')" title="Portrait (Tall)">
                📄 Portrait
              </button>
              <button class="mode-toggle-btn ${orientation === 'landscape' ? 'active' : ''}" onclick="window.DuplexPrint.setOrientation('landscape')" title="Landscape (Wide)">
                🖼️ Landscape
              </button>
            </div>

            <!-- Flip Edge Selector -->
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${flipEdge === 'long-edge' ? 'active' : ''}" onclick="window.DuplexPrint.setFlipEdge('long-edge')" title="Flip on Long Edge (Left-sided / Book binding)">
                📖 Long Edge
              </button>
              <button class="mode-toggle-btn ${flipEdge === 'short-edge' ? 'active' : ''}" onclick="window.DuplexPrint.setFlipEdge('short-edge')" title="Flip on Short Edge (Top / Notepad / Calendar)">
                📋 Short Edge
              </button>
            </div>

            <!-- Color Mode Selector -->
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${mode === 'bw' ? 'active' : ''}" onclick="window.DuplexPrint.setMode('bw')" title="Black & White (Ink-efficient)">
                ⬛ B/W
              </button>
              <button class="mode-toggle-btn ${mode === 'color' ? 'active' : ''}" onclick="window.DuplexPrint.setMode('color')" title="Color">
                🎨 Color
              </button>
            </div>
          </div>
        </div>

        <!-- Step 1: Upload PDF -->
        <div class="step-container active" id="step-upload">
          <div class="step-label">
            <div class="step-number">1</div>
            <div class="step-title">Upload PDF or Generate 4-Page Test Document</div>
          </div>
          <div class="dropzone" id="dropzone-duplex" 
               ondrop="window.DuplexPrint.handleDrop(event)" 
               ondragover="window.DuplexPrint.handleDragOver(event)"
               ondragleave="this.classList.remove('dragover')"
               onclick="document.getElementById('file-input-duplex').click()">
            <div class="dropzone-icon">📄</div>
            <div class="dropzone-text">Drag & drop your PDF here</div>
            <div class="dropzone-subtext">or click to browse (PDF only, max 50MB)</div>
          </div>
          <input type="file" id="file-input-duplex" accept=".pdf" style="display:none" 
                 onchange="window.DuplexPrint.handleFileSelect(event)">

          <div style="margin-top: 16px; padding: 14px 18px; background: rgba(59, 130, 246, 0.08); border: 1px dashed rgba(59, 130, 246, 0.35); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <span>🧪</span>
                <span>Generate Calibrated Duplex Test Document</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">
                Calibrated for <b>${orientation.toUpperCase()}</b> • <b>${flipEdge === 'long-edge' ? 'Flip on Long Edge (Left sided)' : 'Flip on Short Edge'}</b> • Mode: <b>${mode.toUpperCase()}</b>.
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm" onclick="window.DuplexPrint.loadTestDocument(2)" style="white-space: nowrap; font-weight:600;">
                ⚡ 2-Page Test (1 Sheet, Waste-Free)
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.DuplexPrint.loadTestDocument(4)" style="white-space: nowrap; font-weight:600;">
                ⚡ 4-Page Test (2 Sheets)
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Duplex Setup -->
        <div class="step-container" id="step-duplex" style="display:none">
          <div class="step-label">
            <div class="step-number">2</div>
            <div class="step-title">Duplex Print Setup & Layout Analysis</div>
          </div>
          <div id="duplex-info"></div>
        </div>

        <!-- Step 3: Print -->
        <div class="step-container" id="step-print" style="display:none">
          <div class="step-label">
            <div class="step-number">3</div>
            <div class="step-title">Print (Pass 1 Fronts → Reload Confirmation → Pass 2 Backs)</div>
          </div>
          <div id="print-controls"></div>
        </div>
      </div>
    `;

    if (duplexData) {
      renderDuplexResult(duplexData);
    }
  }

  function setMode(m) {
    mode = m;
    render();
  }

  function setOrientation(o) {
    orientation = o;
    // Set default flipEdge matching user specification
    if (orientation === 'landscape') {
      flipEdge = 'short-edge';
    } else {
      flipEdge = 'long-edge';
    }
    render();
    if (duplexData) {
      // Re-split if already loaded
      loadTestDocument();
    }
  }

  function setFlipEdge(f) {
    flipEdge = f;
    render();
    if (duplexData) {
      loadTestDocument();
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  }

  let lastTestCount = 2;

  async function loadTestDocument(count = lastTestCount) {
    lastTestCount = count;
    window.MyPrinter.showLoading(`Generating ${count}-page duplex test (${orientation}, ${flipEdge})...`);
    pass1Printed = false;
    pass2Printed = false;

    try {
      const res = await fetch('/api/duplexprint/sample-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, orientation, flipEdge, pageCount: count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.sessionId) {
        sessionId = data.sessionId;
        window.MyPrinter.currentSession = sessionId;
      }
      duplexData = data;
      renderDuplexResult(data);
      window.MyPrinter.showToast(`${count}-page duplex test document ready!`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Test load failed: ${error.message}`, 'error');
    } finally {
      window.MyPrinter.hideLoading();
    }
  }

  async function uploadFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      window.MyPrinter.showToast('Please upload a PDF file', 'warning');
      return;
    }

    window.MyPrinter.showLoading('Analyzing and splitting PDF...');
    pass1Printed = false;
    pass2Printed = false;
    
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId || '');
      formData.append('orientation', orientation);
      formData.append('flipEdge', flipEdge);
      formData.append('file', file);

      const url = sessionId 
        ? `/api/duplexprint/upload?sessionId=${encodeURIComponent(sessionId)}`
        : '/api/duplexprint/upload';

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to analyze and split PDF');

      if (data.sessionId) {
        sessionId = data.sessionId;
        window.MyPrinter.currentSession = sessionId;
      }

      duplexData = data;
      renderDuplexResult(data);
      window.MyPrinter.showToast(`PDF split into ${data.duplex.oddPageCount} odd + ${data.duplex.evenPageCount} even pages!`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      window.MyPrinter.hideLoading();
    }
  }

  function renderDuplexResult(data) {
    // Show duplex info
    const duplexStep = document.getElementById('step-duplex');
    if (duplexStep) duplexStep.style.display = 'block';
    
    const masterLinkHtml = data.duplex.masterUrl ? `
      <div style="margin-top: 12px;">
        <a href="${data.duplex.masterUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px;">
          <span>👁️</span> Preview Master PDF (${data.originalFile})
        </a>
      </div>
    ` : '';

    const oddPagesLabel = data.duplex.oddPageCount === 1 ? 'Page 1' : 'Pages 1 & 3';
    const evenPagesLabel = data.duplex.evenPageCount === 1 ? 'Page 2' : 'Pages 2 & 4';

    const duplexInfoEl = document.getElementById('duplex-info');
    if (duplexInfoEl) {
      duplexInfoEl.innerHTML = `
        <div class="analysis-panel">
          <div class="analysis-item">
            <span class="analysis-item-label">Original Document</span>
            <span class="analysis-item-value">${data.originalFile}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Orientation & Binding</span>
            <span class="analysis-item-value" style="color:#60a5fa; font-weight:600;">
              ${orientation.toUpperCase()} • ${flipEdge === 'long-edge' ? 'Flip on Long Edge (Left)' : 'Flip on Short Edge'}
            </span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Pass 1: Front Sides</span>
            <span class="analysis-item-value">${data.duplex.oddPageCount} ${data.duplex.oddPageCount === 1 ? 'page' : 'pages'} (${oddPagesLabel})</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Pass 2: Back Sides</span>
            <span class="analysis-item-value">${data.duplex.evenPageCount} ${data.duplex.evenPageCount === 1 ? 'page' : 'pages'} (${evenPagesLabel})</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Paper Sheets Required</span>
            <span class="analysis-item-value" style="color:#10b981; font-weight:700;">${data.duplex.oddPageCount} ${data.duplex.oddPageCount === 1 ? 'sheet' : 'sheets'} of A4</span>
          </div>
        </div>
        ${masterLinkHtml}

        <div style="margin-top: var(--space-lg);">
          <h4 style="font-size: 0.95rem; margin-bottom: var(--space-md); color: var(--text-primary);">📋 Canon G3770 Guided Duplex Instructions</h4>
          <ul class="instruction-list">
            ${data.duplex.instructions.map((inst, i) => `
              <li>
                <span class="step-icon">${i + 1}</span>
                <span>${inst}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    renderPrintControls(data);
  }

  function renderPrintControls(data) {
    const printStep = document.getElementById('step-print');
    if (!printStep) return;
    printStep.style.display = 'block';

    const printControlsEl = document.getElementById('print-controls');
    if (!printControlsEl) return;

    const sheetWord = data.duplex.oddPageCount === 1 ? 'the printed sheet' : `the ${data.duplex.oddPageCount} printed sheets as a stack`;
    const oddPagesLabel = data.duplex.oddPageCount === 1 ? 'Page 1' : 'Pages 1 & 3';
    const evenPagesLabel = data.duplex.evenPageCount === 1 ? 'Page 2' : 'Pages 2 & 4';

    // Instructions on how to flip based on active configuration
    const flipInstruction = orientation === 'portrait'
      ? (flipEdge === 'long-edge'
          ? `1. Collect ${sheetWord} from front output tray.<br>2. <b>Flip horizontally along the long edge</b> (like turning the page of a book).<br>3. Keep the top edge facing UP.<br>4. Re-insert into the rear paper tray with the blank side facing YOU.`
          : `1. Collect ${sheetWord} from front output tray.<br>2. <b>Flip vertically along the short edge</b> (like flipping a notepad).<br>3. Re-insert into the rear paper tray with the blank side facing YOU.`)
      : (flipEdge === 'short-edge'
          ? `1. Collect ${sheetWord} from front output tray.<br>2. <b>Flip horizontally along the short edge</b> (like turning a booklet).<br>3. Keep the top edge aligned.<br>4. Re-insert into the rear paper tray with the blank side facing YOU.`
          : `1. Collect ${sheetWord} from front output tray.<br>2. <b>Flip vertically along the long edge</b>.<br>3. Re-insert into the rear paper tray with the blank side facing YOU.`);

    if (!pass1Printed) {
      // Phase 1: Ready to print Pass 1
      printControlsEl.innerHTML = `
        <div style="display:flex; gap: var(--space-md); flex-wrap:wrap;">
          <div style="flex:1; min-width: 280px;">
            <div class="result-card" style="border-top: 3px solid #2563eb;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--space-sm);">
                <h4 style="margin:0; font-size:1rem;">Phase 1: Print Front Sides (Odd Pages)</h4>
                <span style="font-size:0.75rem; background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:10px; font-weight:600;">${oddPagesLabel}</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                Load <b>${data.duplex.oddPageCount} blank A4 sheet${data.duplex.oddPageCount > 1 ? 's' : ''}</b> into the Canon G3770 rear tray. Mode: <b>${mode.toUpperCase()}</b>.
              </p>
              <div style="display:flex; gap: var(--space-sm); align-items:center;">
                <a href="${data.duplex.oddUrl}" target="_blank" class="btn btn-secondary btn-sm">👁️ Preview Odd Pages</a>
                <button class="btn btn-primary" onclick="window.DuplexPrint.printPass1()">
                  🖨️ Print Pass 1 (${oddPagesLabel})
                </button>
              </div>
            </div>
          </div>
          <div style="flex:1; min-width: 280px; opacity: 0.55;">
            <div class="result-card" style="border-top: 3px solid #94a3b8;">
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
      // Phase 2: Pass 1 is printed, prompting user for paper reload confirmation!
      printControlsEl.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.08); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 12px;">
            <div style="font-size: 1.8rem; line-height: 1;">🔄</div>
            <div>
              <h3 style="margin:0; font-size: 1.15rem; color: #f59e0b;">Pass 1 Complete — Reload Paper Before Pass 2!</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                ${oddPagesLabel} printed. Please reload the sheet${data.duplex.oddPageCount > 1 ? 's' : ''} following the instructions below:
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
            <button class="btn btn-success btn-lg" onclick="window.DuplexPrint.confirmReloadAndPrintPass2()" style="font-weight: 700; padding: 12px 24px; font-size: 1rem;">
              ✅ Yes, I Have Re-inserted the Sheet${data.duplex.oddPageCount > 1 ? 's' : ''} — Print Pass 2 (${evenPagesLabel})
            </button>
            <a href="${data.duplex.evenUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px;">
              👁️ Preview Pass 2
            </a>
            <button class="btn btn-secondary btn-sm" onclick="window.DuplexPrint.printPass1()">
              🔄 Re-print Pass 1 (if misfed)
            </button>
          </div>
        </div>
      `;
    } else {
      // Completed Phase
      const completionSummary = data.duplex.oddPageCount === 1
        ? 'Sheet 1 has <b>Page 1 (Front) / Page 2 (Back)</b> and is properly aligned.'
        : 'Sheet 1 has <b>Page 1 (Front) / Page 2 (Back)</b>. Sheet 2 has <b>Page 3 (Front) / Page 4 (Back)</b>.';

      printControlsEl.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 2px solid #10b981; border-radius: 12px; padding: 22px; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🎉</div>
          <h3 style="margin:0 0 6px; font-size: 1.25rem; color: #10b981;">Double-Sided Printing Complete!</h3>
          <p style="margin: 0 auto 16px; max-width: 500px; font-size: 0.88rem; color: var(--text-secondary);">
            Both passes have been printed! ${completionSummary}
          </p>
          <div style="display:flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.DuplexPrint.loadTestDocument(2)">
              ⚡ Run 2-Page Test (1 Sheet)
            </button>
            <button class="btn btn-secondary" onclick="window.DuplexPrint.loadTestDocument(4)">
              ⚡ Run 4-Page Test (2 Sheets)
            </button>
            <button class="btn btn-secondary" onclick="window.DuplexPrint.resetState()">
              📄 Print Another Document
            </button>
          </div>
        </div>
      `;
    }
  }

  async function printPass1() {
    const oddLabel = duplexData?.duplex?.oddPageCount === 1 ? 'Page 1' : 'Odd Pages 1 & 3';
    window.MyPrinter.showLoading(`Sending Pass 1 (${oddLabel}) in ${mode.toUpperCase()} mode...`);
    try {
      const data = await window.MyPrinter.api('/api/duplexprint/print', {
        method: 'POST',
        body: { sessionId, pageSet: 'odd', mode, orientation },
      });
      window.MyPrinter.showToast(`Pass 1 sent to Canon G3770! ${data.message}`, 'success');
      pass1Printed = true;
      renderPrintControls(duplexData);
    } catch (error) {
      window.MyPrinter.showToast(`Print Pass 1 failed: ${error.message}`, 'error');
    } finally {
      window.MyPrinter.hideLoading();
    }
  }

  async function confirmReloadAndPrintPass2() {
    const evenLabel = duplexData?.duplex?.evenPageCount === 1 ? 'Page 2' : 'Even Pages 2 & 4';
    window.MyPrinter.showLoading(`Sending Pass 2 (${evenLabel}) in ${mode.toUpperCase()} mode...`);
    try {
      const data = await window.MyPrinter.api('/api/duplexprint/print', {
        method: 'POST',
        body: { sessionId, pageSet: 'even', mode, orientation },
      });
      window.MyPrinter.showToast(`Pass 2 sent to Canon G3770! ${data.message}`, 'success');
      pass2Printed = true;
      renderPrintControls(duplexData);
    } catch (error) {
      window.MyPrinter.showToast(`Print Pass 2 failed: ${error.message}`, 'error');
    } finally {
      window.MyPrinter.hideLoading();
    }
  }

  function resetState() {
    pass1Printed = false;
    pass2Printed = false;
    duplexData = null;
    init();
  }

  function loadExistingDuplexData(data) {
    sessionId = data.sessionId;
    window.MyPrinter.currentSession = sessionId;
    duplexData = data;
    pass1Printed = false;
    pass2Printed = false;
    render();
    renderDuplexResult(data);
  }

  return { 
    init, 
    handleDrop, 
    handleDragOver, 
    handleFileSelect, 
    printPass1, 
    confirmReloadAndPrintPass2, 
    setMode, 
    setOrientation, 
    setFlipEdge, 
    loadTestDocument,
    loadExistingDuplexData,
    resetState
  };
})();
