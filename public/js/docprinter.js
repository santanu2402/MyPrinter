/**
 * DocPrinter — System D Frontend
 * Document upload, analysis, optimization, and printing
 */
window.DocPrinter = (() => {
  let sessionId = null;
  let uploadedFile = null;
  let analysis = null;
  let mode = 'bw';

  async function init() {
    const data = await window.MyPrinter.api('/api/docprinter/session', { method: 'POST' });
    sessionId = data.sessionId;
    window.MyPrinter.currentSession = sessionId;
    render();
  }

  function render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="system-page">
        <div class="system-header">
          <button class="btn-back" onclick="window.MyPrinter.navigateHome()">←</button>
          <div>
            <div class="system-title">🖨️ DocPrinter</div>
            <div class="system-subtitle">Analyze, optimize, and print documents with minimal ink</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid var(--border-medium); padding:4px 10px; border-radius:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
              <span>📁</span>
              <span>Session: <b style="color:#c4b5fd;">${sessionId || "Initializing..."}</b></span>
            </div>
            <div class="mode-toggle" id="mode-toggle-doc">
              <button class="mode-toggle-btn ${mode === 'bw' ? 'active' : ''}" onclick="window.DocPrinter.setMode('bw')">⬛ B/W</button>
              <button class="mode-toggle-btn ${mode === 'color' ? 'active' : ''}" onclick="window.DocPrinter.setMode('color')">🎨 Color</button>
            </div>
          </div>
        </div>

        <!-- Step 1: Upload -->
        <div class="step-container active" id="step-upload-doc">
          <div class="step-label">
            <div class="step-number">1</div>
            <div class="step-title">Upload Document</div>
          </div>
          <div class="dropzone" id="dropzone-doc"
               ondrop="window.DocPrinter.handleDrop(event)"
               ondragover="window.DocPrinter.handleDragOver(event)"
               ondragleave="this.classList.remove('dragover')"
               onclick="document.getElementById('file-input-doc').click()">
            <div class="dropzone-icon">📁</div>
            <div class="dropzone-text">Drag & drop your document here</div>
            <div class="dropzone-subtext">Supports PDF files (max 100MB)</div>
          </div>
          <input type="file" id="file-input-doc" accept=".pdf" style="display:none"
                 onchange="window.DocPrinter.handleFileSelect(event)">
        </div>

        <!-- Step 2: Analysis -->
        <div class="step-container" id="step-analysis" style="display:none">
          <div class="step-label">
            <div class="step-number">2</div>
            <div class="step-title">Document Analysis</div>
          </div>
          <div id="analysis-content"></div>
        </div>

        <!-- Step 3: Optimize & Print -->
        <div class="step-container" id="step-optimize" style="display:none">
          <div class="step-label">
            <div class="step-number">3</div>
            <div class="step-title">Optimize & Print</div>
          </div>
          <div id="optimize-content"></div>
        </div>

        <!-- Result -->
        <div id="step-result-doc" style="display:none"></div>
      </div>
    `;
  }

  function setMode(m) {
    mode = m;
    // Update toggle without full re-render
    document.querySelectorAll('#mode-toggle-doc .mode-toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
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

  async function uploadFile(file) {
    window.MyPrinter.showLoading('Analyzing document...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const res = await fetch('/api/docprinter/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      uploadedFile = data.file;
      analysis = data.analysis;

      // Update mode based on recommendation
      if (analysis.recommendation && analysis.recommendation.suggestedMode === 'bw') {
        mode = 'bw';
      }

      // Show analysis
      const analysisStep = document.getElementById('step-analysis');
      analysisStep.style.display = 'block';

      document.getElementById('analysis-content').innerHTML = `
        <div class="analysis-panel">
          <div class="analysis-item">
            <span class="analysis-item-label">File Name</span>
            <span class="analysis-item-value">${uploadedFile.name}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">File Size</span>
            <span class="analysis-item-value">${window.MyPrinter.formatSize(uploadedFile.size)}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Pages</span>
            <span class="analysis-item-value">${analysis.pageCount}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Color Profile</span>
            <span class="analysis-item-value">${analysis.colorProfile || 'Unknown'}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Estimated Ink Coverage</span>
            <span class="analysis-item-value">${analysis.estimatedInkCoverage || 'Unknown'}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Word Count</span>
            <span class="analysis-item-value">${analysis.wordCount || 'N/A'}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-item-label">Page Format</span>
            <span class="analysis-item-value" style="color: #10b981; font-weight: 600;">A4 (Auto-Fit)</span>
          </div>
        </div>

        ${analysis.recommendation ? `
        <div class="analysis-suggestions">
          <h4>💡 Optimization Suggestions</h4>
          <ul style="list-style:none; padding:0;">
            ${analysis.recommendation.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
          <p style="margin-top: var(--space-sm); font-size: 0.8rem; color: var(--text-accent);">
            Estimated ink saving: ${analysis.recommendation.estimatedInkSaving}
          </p>
        </div>
        ` : ''}
      `;

      // Show optimize & print
      const optimizeStep = document.getElementById('step-optimize');
      optimizeStep.style.display = 'block';

      document.getElementById('optimize-content').innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Print Quality</label>
            <select class="form-select" id="print-quality">
              <option value="draft">Draft (Fastest, least ink)</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High Quality</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap: var(--space-sm); margin-top: var(--space-md);">
          <button class="btn btn-secondary" onclick="window.DocPrinter.optimize()">
            ⚡ Optimize Document
          </button>
          <button class="btn btn-success btn-lg" onclick="window.DocPrinter.print()" style="flex:1">
            🖨️ Print Document
          </button>
        </div>
      `;

      window.MyPrinter.showToast('Document analyzed successfully!', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Upload failed: ${error.message}`, 'error');
    }

    window.MyPrinter.hideLoading();
  }

  async function optimize() {
    if (!uploadedFile) return;

    window.MyPrinter.showLoading('Optimizing document...');
    try {
      const data = await window.MyPrinter.api('/api/docprinter/optimize', {
        method: 'POST',
        body: { sessionId, filename: uploadedFile.filename, mode },
      });

      const resultDiv = document.getElementById('step-result-doc');
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-header">
            <div class="result-title">✅ Document Optimized</div>
          </div>
          <div class="result-stats">
            <div class="stat-item">
              <div class="stat-value">${window.MyPrinter.formatSize(data.originalSize)}</div>
              <div class="stat-label">Original</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${window.MyPrinter.formatSize(data.optimizedSize)}</div>
              <div class="stat-label">Optimized</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${data.savings}%</div>
              <div class="stat-label">Size Saved</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: #10b981;">A4</div>
              <div class="stat-label">${data.pagesScaledToA4 > 0 ? `${data.pagesScaledToA4} Scaled to A4` : 'A4 Ready'}</div>
            </div>
          </div>
          <div style="display:flex; gap: var(--space-sm);">
            <a href="${data.outputUrl}" download class="btn btn-secondary">⬇ Download Optimized</a>
            <button class="btn btn-success btn-lg" onclick="window.DocPrinter.print()" style="flex:1">
              🖨️ Print Optimized
            </button>
          </div>
        </div>
      `;

      window.MyPrinter.showToast('Document optimized!', 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Optimization failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  async function print() {
    if (!uploadedFile) return;

    const quality = document.getElementById('print-quality')?.value || 'normal';
    
    window.MyPrinter.showLoading('Sending to printer...');
    try {
      const data = await window.MyPrinter.api('/api/docprinter/print', {
        method: 'POST',
        body: { sessionId, filename: uploadedFile.filename, mode, quality },
      });
      window.MyPrinter.showToast(`Print job sent! ${data.message}`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Print failed: ${error.message}`, 'error');
    }
    window.MyPrinter.hideLoading();
  }

  return { init, handleDrop, handleDragOver, handleFileSelect, optimize, print, setMode };
})();
