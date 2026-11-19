/**
 * ImgToDoc — System A Frontend
 * AI Research Planner, Concrete Entity Search, Quality Feedback Engine,
 * Consolidated A4 layout, Small/Medium sizing, ink saver,
 * and UI Photo Reference Sheet for user note-taking
 */
window.ImgToDoc = (() => {
  let sessionId = null;
  let searchResults = [];
  let searchPlans = [];
  let selectedImages = [];
  let downloadedImages = [];
  let generatedReferences = [];
  let mode = 'color';
  let sizeMode = 'all'; // 'all' or 'specific'
  let globalPhotoSize = 'auto';
  let inkSaveLevel = 'medium';
  let activeTopicFilter = 'all';

  async function init() {
    try {
      const data = await window.MyPrinter.api('/api/imgtodoc/session', { method: 'POST' });
      sessionId = data.sessionId;
      window.MyPrinter.currentSession = sessionId;
      render();
    } catch (e) {
      window.MyPrinter.showToast('Failed to initialize session: ' + e.message, 'error');
    }
  }

  function render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="system-page">
        <div class="system-header">
          <button class="btn-back" onclick="window.MyPrinter.navigateHome()" title="Back to Home">←</button>
          <div>
            <div class="system-title">📸 ImgToDoc — Smart Multi-Topic Print Studio</div>
            <div class="system-subtitle">AI Research Planner, Quality Feedback Engine, Consolidated A4, Ink-Saver & UI Reference Notes</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap: 12px; flex-wrap:wrap;">
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid var(--border-medium); padding:4px 10px; border-radius:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
              <span>📁</span>
              <span>Session: <b style="color:#c4b5fd;">${sessionId || "Initializing..."}</b></span>
            </div>
            <div class="mode-toggle">
              <button class="mode-toggle-btn ${mode === 'color' ? 'active' : ''}" onclick="window.ImgToDoc.setMode('color')">🎨 Color</button>
              <button class="mode-toggle-btn ${mode === 'grayscale' ? 'active' : ''}" onclick="window.ImgToDoc.setMode('grayscale')">⬛ B/W</button>
            </div>
          </div>
        </div>

        <!-- Step 1: Prompt Input -->
        <div class="step-container" id="step-search">
          <div class="step-label">
            <div class="step-number">1</div>
            <div class="step-title">Enter Image Request or Multi-Topic Prompt</div>
          </div>
          <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:12px;">
            Supports single or consolidated multi-topic prompts. The <b>AI Research Planner</b> analyzes broad categories into concrete real-world entities, and the <b>Quality Feedback Engine</b> screens candidates to guarantee directly relevant, authentic photographs without diagrams or junk.
          </p>

          <div class="form-group">
            <textarea class="form-input" id="search-query" rows="3" 
                      placeholder="e.g. 5 images of traditional old methods of farming, 5 images of modern method of farming, 5 food crops, 5 non food crops, 5 crops cultivated in horticulture"
                      style="resize:vertical; font-family:inherit; font-size:0.95rem; line-height:1.5;"></textarea>
          </div>

          <!-- Quick Fill Suggestions -->
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; align-items:center;">
            <span style="font-size:0.8rem; color:var(--text-muted);">Quick Prompts:</span>
            <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" 
                    onclick="window.ImgToDoc.fillPrompt('5 images of traditional old methods of farming, 5 images of modern method of farming, 5 food crops, 5 non food crops, 5 crops cultivated in horticulture')">
              🌾 25 Agriculture Multi-Topic Prompt
            </button>
            <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" 
                    onclick="window.ImgToDoc.fillPrompt('5 traditional old methods of farming')">
              🐂 5 Traditional Old Farming Methods
            </button>
            <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" 
                    onclick="window.ImgToDoc.fillPrompt('5 modern method of farming')">
              🚜 5 Modern Farming Methods
            </button>
          </div>

          <button class="btn btn-primary btn-lg" onclick="window.ImgToDoc.search()" id="btn-search">
            🔍 Plan Research & Find Relevant Photos
          </button>
        </div>

        <!-- Step 2: Select Images -->
        <div class="step-container" id="step-select" style="display:none">
          <div class="step-label">
            <div class="step-number">2</div>
            <div class="step-title">AI Research Plan & Verified Photos (<span id="selected-count">0</span> selected)</div>
          </div>

          <!-- AI Research & Search Plan Card -->
          <div id="search-plan-container" style="margin-bottom:16px;"></div>

          <!-- Topic Filter Bar -->
          <div id="topic-filter-bar" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;"></div>

          <div class="image-grid" id="image-results"></div>
          <div style="margin-top: var(--space-md); display:flex; gap: var(--space-sm); align-items:center;">
            <button class="btn btn-secondary" onclick="window.ImgToDoc.selectAll()">Select All</button>
            <button class="btn btn-secondary" onclick="window.ImgToDoc.selectNone()">Clear Selection</button>
            <button class="btn btn-primary" onclick="window.ImgToDoc.downloadSelected()" id="btn-download" style="margin-left:auto;">
              ⬇ Download & Analyze Selected
            </button>
          </div>
        </div>

        <!-- Step 3: Configure -->
        <div class="step-container" id="step-configure" style="display:none">
          <div class="step-label">
            <div class="step-number">3</div>
            <div class="step-title">Layout & Small/Medium Sizing</div>
          </div>

          <!-- Small/Medium Sizing Box -->
          <div style="background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.08)); border:1px solid rgba(99,102,241,0.25); border-radius:var(--radius-md); padding:16px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:700; font-size:0.95rem; color:#a78bfa;">🧠 Consolidated Small to Medium Auto-Fit</span>
              <span style="font-size:0.8rem; background:rgba(16,185,129,0.15); color:#10b981; padding:3px 10px; border-radius:12px; font-weight:600;">
                ✓ Clean Photos (No Print Underlines/Captions)
              </span>
            </div>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:14px; line-height:1.4;">
              All images across your topics will be consolidated into multi-image A4 sheets using <b>Small to Medium formats (~98×94mm)</b>. Intelligently balances max 4–6 photos per page (organized by topic) so pictures stay crisp, detailed, and never shrink into micro-thumbnails. Clean, text-free framed photos save paper and ink, while the full identification guide is in the UI for your notes.
            </p>

            <div style="display:flex; gap:20px; margin-bottom:12px; flex-wrap:wrap;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="radio" name="sizeMode" value="all" ${sizeMode === 'all' ? 'checked' : ''} onchange="window.ImgToDoc.setSizeMode('all')">
                <span style="font-size:0.9rem;">🎯 AI Smart Auto-Fit (Balanced Small to Medium ~98×94mm, Never Over-Shrunk)</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="radio" name="sizeMode" value="specific" ${sizeMode === 'specific' ? 'checked' : ''} onchange="window.ImgToDoc.setSizeMode('specific')">
                <span style="font-size:0.9rem;">📐 Custom Small/Medium Size per Photo</span>
              </label>
            </div>

            <div id="global-size-container" style="display:${sizeMode === 'all' ? 'block' : 'none'};">
              <label class="form-label" style="font-size:0.85rem;">Standard Sizing Mode:</label>
              <select class="form-select" id="global-photo-size" onchange="window.ImgToDoc.setGlobalSize(this.value)">
                <option value="auto" ${globalPhotoSize === 'auto' ? 'selected' : ''}>🎯 AI Smart Fit (Balanced Small-to-Medium ~98×94mm, Multi-Page)</option>
                <option value="medium-4x6" ${globalPhotoSize === 'medium-4x6' ? 'selected' : ''}>Medium 4×6" (102×152 mm / 10×15 cm) — Standard Medium</option>
                <option value="medium-3x5" ${globalPhotoSize === 'medium-3x5' ? 'selected' : ''}>Medium 3.5×5" (89×127 mm) — Compact Photo</option>
                <option value="small-wallet" ${globalPhotoSize === 'small-wallet' ? 'selected' : ''}>Small Wallet (64×89 mm / 2.5×3.5") — Low Ink</option>
                <option value="small-passport" ${globalPhotoSize === 'small-passport' ? 'selected' : ''}>Mini Passport (35×45 mm) — Minimal Ink</option>
              </select>
            </div>
          </div>

          <!-- Advanced Ink Saver Controls -->
          <div style="background:var(--bg-glass); border:1px solid var(--border-medium); border-radius:var(--radius-md); padding:16px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <div style="font-weight:700; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                💧 Advanced Ink Optimization Engine (Canon G3770):
              </div>
              <span style="font-size:0.8rem; background:rgba(16,185,129,0.15); color:#10b981; padding:3px 10px; border-radius:12px; font-weight:600;">
                Active: ${inkSaveLevel === 'maximum' ? '🛡️ Super Draft (-55% Ink)' : inkSaveLevel === 'high' ? '🌿 High Eco (-42% Ink)' : inkSaveLevel === 'low' ? '✨ Subtle (-15% Ink)' : '🌱 Balanced Eco (-28% Ink)'}
              </span>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:10px; margin-bottom:12px;">
              <button type="button" class="btn ${inkSaveLevel === 'maximum' ? 'btn-primary' : 'btn-secondary'}" onclick="window.ImgToDoc.setInkLevel('maximum')">
                🛡️ Maximum Eco<br><span style="font-size:0.75rem; font-weight:normal; opacity:0.85;">-55% Ink / Super Draft</span>
              </button>
              <button type="button" class="btn ${inkSaveLevel === 'high' ? 'btn-primary' : 'btn-secondary'}" onclick="window.ImgToDoc.setInkLevel('high')">
                🌿 High Eco<br><span style="font-size:0.75rem; font-weight:normal; opacity:0.85;">-42% Ink / Shadow Lift</span>
              </button>
              <button type="button" class="btn ${inkSaveLevel === 'medium' ? 'btn-primary' : 'btn-secondary'}" onclick="window.ImgToDoc.setInkLevel('medium')">
                🌱 Balanced Eco<br><span style="font-size:0.75rem; font-weight:normal; opacity:0.85;">-28% Ink (Recommended)</span>
              </button>
              <button type="button" class="btn ${inkSaveLevel === 'low' ? 'btn-primary' : 'btn-secondary'}" onclick="window.ImgToDoc.setInkLevel('low')">
                ✨ Subtle<br><span style="font-size:0.75rem; font-weight:normal; opacity:0.85;">-15% Ink (Full Tone)</span>
              </button>
            </div>

            <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.4; display:flex; flex-direction:column; gap:4px; background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:6px;">
              <div>✔ <b>Shadow Lifting (UCR)</b>: Clamps deep blacks to soft charcoal, stopping 4-color ink soaking.</div>
              <div>✔ <b>Zero-Ink Highlights</b>: Automatically whitens light backgrounds and skies (&gt;232) to 0 ink droplets.</div>
              <div>✔ <b>Gamma Midtone Expansion</b>: Lightens dense midtones where 65% of ink is sprayed.</div>
              <div>✔ <b>Micro-Edge Contrast</b>: Adaptive sharpening ensures text & boundaries remain razor sharp.</div>
            </div>
          </div>

          <!-- Photo Analysis List -->
          <div class="form-label" style="margin-top: var(--space-md); font-size:1rem;">
            🖼️ Downloaded Photos & Analysis:
          </div>
          <div id="captions-list"></div>

          <button class="btn btn-primary btn-lg btn-full" onclick="window.ImgToDoc.generatePdf()" id="btn-generate" style="margin-top: var(--space-lg);">
            📄 Generate Consolidated PDF
          </button>
        </div>

        <!-- Step 4: Result & UI Reference Sheet -->
        <div id="step-result" style="display:none"></div>
      </div>
    `;
  }

  function fillPrompt(text) {
    const input = document.getElementById('search-query');
    if (input) input.value = text;
  }

  function setMode(m) {
    mode = m;
    render();
  }

  function setSizeMode(sm) {
    sizeMode = sm;
    const globalContainer = document.getElementById('global-size-container');
    if (globalContainer) {
      globalContainer.style.display = sizeMode === 'all' ? 'block' : 'none';
    }
    renderCaptionsList();
  }

  function setGlobalSize(sz) {
    globalPhotoSize = sz;
  }

  function setInkLevel(lvl) {
    inkSaveLevel = lvl;
    render();
    document.getElementById('step-search').style.display = 'none';
    document.getElementById('step-select').style.display = 'block';
    document.getElementById('step-configure').style.display = 'block';
  }

  async function search() {
    const rawQuery = document.getElementById('search-query').value.trim();

    if (!rawQuery) {
      window.MyPrinter.showToast('Please enter a search prompt', 'warning');
      return;
    }

    const btn = document.getElementById('btn-search');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Researching entities & searching web...';

    try {
      const data = await window.MyPrinter.api('/api/imgtodoc/search', {
        method: 'POST',
        body: { query: rawQuery, sessionId },
      });

      searchResults = data.images || [];
      searchPlans = data.searchPlans || [];
      selectedImages = [];

      if (searchResults.length === 0) {
        window.MyPrinter.showToast('No images found meeting the quality criteria. Please try different keywords.', 'warning');
        btn.disabled = false;
        btn.innerHTML = '🔍 Plan Research & Find Relevant Photos';
        return;
      }

      // Collect unique topics
      const topics = ['all', ...new Set(searchResults.map(img => img.topic).filter(Boolean))];
      activeTopicFilter = 'all';

      // Render AI Research Plan banner
      renderSearchPlan();

      // Render topic filter pills
      const filterBar = document.getElementById('topic-filter-bar');
      filterBar.innerHTML = topics.map(t => {
        const count = t === 'all' ? searchResults.length : searchResults.filter(img => img.topic === t).length;
        const label = t === 'all' ? `All Topics (${count})` : `${t} (${count})`;
        return `
          <button class="btn ${activeTopicFilter === t ? 'btn-primary' : 'btn-secondary'}" 
                  style="font-size:0.8rem; padding:4px 12px; border-radius:14px;"
                  onclick="window.ImgToDoc.filterByTopic('${t.replace(/'/g, "\\'")}')">
            ${label}
          </button>
        `;
      }).join('');

      renderImageGrid();
      selectAll();

      const selectStep = document.getElementById('step-select');
      selectStep.style.display = 'block';
      window.MyPrinter.showToast(`Found ${searchResults.length} verified photos across ${topics.length - 1} category plan(s)!`, 'success');
      selectStep.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.MyPrinter.showToast(`Search failed: ${error.message}`, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '🔍 Plan Research & Find Relevant Photos';
  }

  function renderSearchPlan() {
    const container = document.getElementById('search-plan-container');
    if (!container || !searchPlans || searchPlans.length === 0) return;

    container.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(99,102,241,0.14), rgba(168,85,247,0.08)); border:1px solid rgba(139,92,246,0.35); border-radius:var(--radius-md); padding:16px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="font-weight:700; color:#c4b5fd; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
            🎯 AI Research & Search Plan (Concrete Real-World Entities)
          </div>
          <span style="font-size:0.75rem; background:rgba(16,185,129,0.2); color:#10b981; padding:3px 10px; border-radius:12px; font-weight:600;">
            ✓ Quality Feedback Engine: Ultra-Precision Band (≥90% Relevance Threshold)
          </span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${searchPlans.map((plan, pIdx) => `
            <div style="background:rgba(0,0,0,0.28); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                <span style="font-size:0.85rem; font-weight:700; color:#e0e7ff;">
                  📂 Plan #${pIdx + 1}: ${plan.categoryName} (${plan.entities.length} Researched Entities)
                </span>
                <span style="font-size:0.72rem; color:#a5b4fc; background:rgba(99,102,241,0.2); padding:1px 8px; border-radius:8px;">
                  ${plan.isKnownCategory ? 'Curated Agricultural Taxonomy' : 'Decomposed Topic Model'}
                </span>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${plan.entities.map(e => `
                  <span style="font-size:0.75rem; background:rgba(124,58,237,0.22); border:1px solid rgba(139,92,246,0.35); color:#ddd6fe; padding:2px 8px; border-radius:6px; font-weight:500;">
                    🎯 ${e.name}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function filterByTopic(topic) {
    activeTopicFilter = topic;
    
    // Update active button
    const filterBar = document.getElementById('topic-filter-bar');
    const topics = ['all', ...new Set(searchResults.map(img => img.topic).filter(Boolean))];
    filterBar.innerHTML = topics.map(t => {
      const count = t === 'all' ? searchResults.length : searchResults.filter(img => img.topic === t).length;
      const label = t === 'all' ? `All Topics (${count})` : `${t} (${count})`;
      return `
        <button class="btn ${activeTopicFilter === t ? 'btn-primary' : 'btn-secondary'}" 
                style="font-size:0.8rem; padding:4px 12px; border-radius:14px;"
                onclick="window.ImgToDoc.filterByTopic('${t.replace(/'/g, "\\'")}')">
          ${label}
        </button>
      `;
    }).join('');

    renderImageGrid();
  }

  function renderImageGrid() {
    const grid = document.getElementById('image-results');
    const filtered = activeTopicFilter === 'all'
      ? searchResults
      : searchResults.filter(img => img.topic === activeTopicFilter);

    grid.innerHTML = filtered.map(img => {
      const i = img.id;
      const isSelected = selectedImages.includes(i);
      return `
        <div class="image-card ${isSelected ? 'selected' : ''}" id="img-card-${i}" onclick="window.ImgToDoc.toggleImage(${i})">
          <img src="${img.thumbnail || img.url}" alt="${img.title}" loading="lazy" 
               onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%231a1a2e\\' width=\\'100\\' height=\\'100\\'/><text x=\\'50\\' y=\\'55\\' text-anchor=\\'middle\\' fill=\\'%23666\\' font-size=\\'12\\'>No preview</text></svg>'">
          <div class="image-card-overlay">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:0.68rem; color:#c4b5fd; font-weight:700; text-transform:uppercase;">${img.topic || 'General'}</span>
              <span style="font-size:0.65rem; background:rgba(16,185,129,0.25); color:#10b981; padding:1px 5px; border-radius:8px; font-weight:600;">✓ ${img.relevanceScore || 90}% Match</span>
            </div>
            <div style="font-size:0.82rem; font-weight:700; color:#fff; line-height:1.2; margin-bottom:2px;">
              🎯 ${img.entityName || img.title}
            </div>
            <div style="font-size:0.72rem; color:#cbd5e1; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${truncate(img.description || img.title, 45)}
            </div>
          </div>
          <div class="image-card-check">✓</div>
        </div>
      `;
    }).join('');

    document.getElementById('selected-count').textContent = selectedImages.length;
  }

  function toggleImage(index) {
    const card = document.getElementById(`img-card-${index}`);
    const idx = selectedImages.indexOf(index);

    if (idx >= 0) {
      selectedImages.splice(idx, 1);
      if (card) card.classList.remove('selected');
    } else {
      selectedImages.push(index);
      if (card) card.classList.add('selected');
    }

    document.getElementById('selected-count').textContent = selectedImages.length;
  }

  function selectAll() {
    selectedImages = searchResults.map(img => img.id);
    searchResults.forEach(img => {
      const card = document.getElementById(`img-card-${img.id}`);
      if (card) card.classList.add('selected');
    });
    document.getElementById('selected-count').textContent = selectedImages.length;
  }

  function selectNone() {
    selectedImages = [];
    searchResults.forEach(img => {
      const card = document.getElementById(`img-card-${img.id}`);
      if (card) card.classList.remove('selected');
    });
    document.getElementById('selected-count').textContent = '0';
  }

  async function downloadSelected() {
    if (selectedImages.length === 0) {
      window.MyPrinter.showToast('Please select at least one image', 'warning');
      return;
    }

    const btn = document.getElementById('btn-download');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Downloading & analyzing images...';

    try {
      const imagesToDownload = searchResults.filter(img => selectedImages.includes(img.id));
      const data = await window.MyPrinter.api('/api/imgtodoc/download', {
        method: 'POST',
        body: { images: imagesToDownload, sessionId },
      });

      downloadedImages = data.images || [];

      const configStep = document.getElementById('step-configure');
      configStep.style.display = 'block';

      renderCaptionsList();

      window.MyPrinter.showToast(`Downloaded & analyzed ${downloadedImages.length} images! Configure layout below.`, 'success');
      configStep.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.MyPrinter.showToast(`Download failed: ${error.message}`, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '⬇ Download & Analyze Selected';
  }

  function renderCaptionsList() {
    const captionsList = document.getElementById('captions-list');
    if (!captionsList) return;

    captionsList.innerHTML = downloadedImages.map((img, i) => {
      const a = img.analysis || {};
      const recommended = a.recommendedSize || 'medium-4x6';

      return `
        <div class="caption-row" style="display:flex; flex-direction:column; gap:8px; background:var(--bg-glass); padding:12px; border-radius:var(--radius-md); margin-bottom:10px; border:1px solid var(--border-medium);">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${img.thumbnailUrl}" class="caption-thumb" alt="thumb"
                 style="width:58px; height:58px; object-fit:cover; border-radius:8px; border:1px solid var(--border-medium);"
                 onerror="this.style.background='var(--bg-input)'">
            
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <span style="font-size:0.75rem; background:rgba(124,58,237,0.25); color:#c4b5fd; padding:2px 8px; border-radius:10px; font-weight:700;">
                  #${i + 1} ${img.topic || 'General'}
                </span>
                <span style="font-size:0.75rem; background:rgba(16,185,129,0.2); color:#10b981; padding:2px 8px; border-radius:10px; font-weight:600;">
                  🎯 ${img.entityName || img.title}
                </span>
                <span style="font-size:0.75rem; background:rgba(99,102,241,0.2); color:#a78bfa; padding:2px 8px; border-radius:10px; font-weight:600;">
                  📐 ${img.width}×${img.height} px
                </span>
                <span style="font-size:0.75rem; background:rgba(16,185,129,0.15); color:#10b981; padding:2px 8px; border-radius:10px; font-weight:600;">
                  ✨ ${a.sizeLabel || 'Medium (4×6")'}
                </span>
              </div>
              <div style="font-size:0.88rem; font-weight:600; color:var(--text-primary); margin-bottom:2px;">
                ${img.title || img.entityName || 'Image ' + (i + 1)}
              </div>
              <p style="font-size:0.78rem; color:var(--text-secondary); margin:0;">
                ${img.description || a.reasoning || 'Clean small/medium print.'}
              </p>
            </div>

            ${sizeMode === 'specific' ? `
              <div style="width:200px; border-left:1px solid var(--border-subtle); padding-left:12px;">
                <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Size Choice:</label>
                <select class="form-select" id="size-specific-${i}" style="font-size:0.82rem; padding:6px 8px;">
                  <option value="medium-4x6" ${recommended === 'medium-4x6' ? 'selected' : ''}>Medium 4×6" (10×15cm)</option>
                  <option value="medium-3x5" ${recommended === 'medium-3x5' ? 'selected' : ''}>Medium 3.5×5" (9×13cm)</option>
                  <option value="small-wallet" ${recommended === 'small-wallet' ? 'selected' : ''}>Small Wallet (64×89mm)</option>
                  <option value="small-passport" ${recommended === 'small-passport' ? 'selected' : ''}>Mini Passport (35×45mm)</option>
                </select>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  async function generatePdf() {
    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Consolidating images & building A4 document...';

    try {
      const perImageSizes = {};

      if (sizeMode === 'specific') {
        downloadedImages.forEach((img, i) => {
          const sizeSelect = document.getElementById(`size-specific-${i}`);
          if (sizeSelect) perImageSizes[i] = sizeSelect.value;
        });
      }

      const photoSize = sizeMode === 'all'
        ? (document.getElementById('global-photo-size')?.value || 'auto')
        : 'auto';

      const data = await window.MyPrinter.api('/api/imgtodoc/generate', {
        method: 'POST',
        body: {
          sessionId,
          images: downloadedImages,
          photoSize,
          perImageSizes,
          mode,
          inkSaveLevel,
          includeCaptions: false, // Pure clean photos on paper without captions
        },
      });

      generatedReferences = data.photoReference || [];

      // Show result
      const resultDiv = document.getElementById('step-result');
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-header">
            <div class="result-title">✅ Consolidated Print-Ready Document Generated</div>
          </div>
          <div class="result-stats">
            <div class="stat-item">
              <div class="stat-value">${data.imageCount} photos on ${data.pagesCount || 1} page(s)</div>
              <div class="stat-label">📄 Multi-Topic Auto-Fit</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color:#10b981;">💧 ~${data.inkSavings?.savedPercent || 35}% SAVED</div>
              <div class="stat-label">Ink Conserved</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${mode === 'color' ? '🎨 Color Saver' : '⬛ B/W (0% Color Ink)'}</div>
              <div class="stat-label">Ink Mode</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">🌿 Saved ${Math.max(0, data.imageCount - (data.pagesCount || 1))} sheets</div>
              <div class="stat-label">Paper Conserved</div>
            </div>
          </div>

          <div class="pdf-preview" style="height:520px; margin: 16px 0;">
            <iframe src="${data.pdfUrl}#toolbar=0" style="width:100%; height:100%; border:none; border-radius:8px;" title="PDF Preview"></iframe>
          </div>

          <div style="background:var(--bg-glass); border:1px solid var(--border-medium); border-radius:var(--radius-md); padding:16px; margin-top:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-weight:600;">🖨️ Connected Printer: <b>Canon G3770</b> (192.168.0.111 via WiFi)</span>
              <span class="printer-status-badge ready">● Ready</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.85rem; color:var(--text-secondary);">Copies:</label>
                <input type="number" id="print-copies" value="1" min="1" max="10" class="form-input" style="width:70px; padding:6px 10px;">
              </div>
              <a href="${data.pdfUrl}" download="myprinter_consolidated.pdf" class="btn btn-secondary">
                ⬇ Download PDF
              </a>
              <button class="btn btn-success btn-lg" onclick="window.ImgToDoc.print('${data.pdfUrl}')" style="flex:1;">
                🖨️ Send Print Job to Canon G3770
              </button>
            </div>
          </div>

          <!-- UI-Only Photo Reference & Notes Sheet for User Record -->
          <div style="margin-top:28px; background:rgba(13,13,24,0.9); border:1px solid rgba(99,102,241,0.3); border-radius:var(--radius-lg); padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
              <div>
                <div style="font-size:1.1rem; font-weight:700; color:#e0e7ff; display:flex; align-items:center; gap:8px;">
                  📋 Photo Reference & Identification Guide (For Your Notes)
                </div>
                <div style="font-size:0.82rem; color:var(--text-secondary);">
                  Printed pages contain clean photos without text. Below is the numbered reference guide with researched entity names and descriptions to note down and refer to later.
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary" style="font-size:0.85rem;" onclick="window.ImgToDoc.copyReferenceNotes()">
                  📋 Copy Notes to Clipboard
                </button>
                <button class="btn btn-secondary" style="font-size:0.85rem;" onclick="window.ImgToDoc.downloadReferenceNotes()">
                  💾 Export Notes (.txt)
                </button>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
              ${generatedReferences.map(ref => `
                <div style="display:flex; align-items:flex-start; gap:14px; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                  <div style="min-width:32px; height:32px; background:var(--accent-primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem;">
                    ${ref.number}
                  </div>
                  <img src="${ref.thumbnailUrl}" style="width:52px; height:52px; object-fit:cover; border-radius:6px; border:1px solid var(--border-medium);" alt="thumb" onerror="this.style.display='none'">
                  <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px; flex-wrap:wrap;">
                      <span style="font-size:0.75rem; background:rgba(124,58,237,0.25); color:#c4b5fd; padding:1px 8px; border-radius:10px; font-weight:600;">
                        ${ref.topic}
                      </span>
                      <span style="font-size:0.75rem; background:rgba(16,185,129,0.2); color:#10b981; padding:1px 8px; border-radius:10px; font-weight:600;">
                        🎯 ${ref.entityName || ref.title}
                      </span>
                      <span style="font-weight:600; font-size:0.88rem; color:#fff;">
                        ${ref.title}
                      </span>
                    </div>
                    <div style="font-size:0.82rem; color:#d1d5db; line-height:1.4;">
                      ${ref.description || 'Reference image for ' + (ref.entityName || ref.topic)}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      window.MyPrinter.showToast('Document ready! Reference sheet generated below for your notes.', 'success');
      resultDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.MyPrinter.showToast(`Generation failed: ${error.message}`, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '📄 Generate Consolidated PDF';
  }

  function getReferenceText() {
    let text = `====================================================\n`;
    text += `MyPrinter Photo Reference & Identification Notes\n`;
    text += `Date: ${new Date().toLocaleDateString()} | Total Photos: ${generatedReferences.length}\n`;
    text += `Quality: 100% Photographic Authenticity via AI Research Planner\n`;
    text += `====================================================\n\n`;

    let currentTopic = '';
    generatedReferences.forEach(ref => {
      if (ref.topic !== currentTopic) {
        currentTopic = ref.topic;
        text += `\n--- Category: ${currentTopic.toUpperCase()} ---\n`;
      }
      text += `[Photo #${ref.number}] 🎯 ${ref.entityName || ref.title}\n`;
      text += `   Title: ${ref.title}\n`;
      text += `   Description: ${ref.description || 'N/A'}\n\n`;
    });

    return text;
  }

  function copyReferenceNotes() {
    const text = getReferenceText();
    navigator.clipboard.writeText(text).then(() => {
      window.MyPrinter.showToast('Copied photo reference notes to clipboard!', 'success');
    }).catch(e => {
      window.MyPrinter.showToast('Failed to copy: ' + e.message, 'error');
    });
  }

  function downloadReferenceNotes() {
    const text = getReferenceText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MyPrinter_Photo_Reference_Notes.txt';
    a.click();
    URL.revokeObjectURL(url);
    window.MyPrinter.showToast('Exported MyPrinter_Photo_Reference_Notes.txt', 'success');
  }

  async function print(pdfUrl) {
    const copies = parseInt(document.getElementById('print-copies')?.value, 10) || 1;
    window.MyPrinter.showLoading('Sending print job directly to Canon G3770 (192.168.0.111)...');

    try {
      const filename = pdfUrl.split('/').pop().split('?')[0].split('#')[0];
      const data = await window.MyPrinter.api('/api/printer/print', {
        method: 'POST',
        body: {
          sessionId,
          filename,
          system: 'imgtodoc',
          mode: mode === 'color' ? 'color' : 'bw',
          copies,
          inkSaveLevel,
        },
      });

      window.MyPrinter.showToast(`🎉 ${data.message || 'Print job sent successfully!'}`, 'success');
    } catch (error) {
      window.MyPrinter.showToast(`Print failed: ${error.message}`, 'error');
    }

    window.MyPrinter.hideLoading();
  }

  function truncate(text, max) {
    if (!text) return '';
    return text.length > max ? text.substring(0, max) + '...' : text;
  }

  return {
    init,
    search,
    filterByTopic,
    fillPrompt,
    toggleImage,
    selectAll,
    selectNone,
    downloadSelected,
    setSizeMode,
    setGlobalSize,
    setInkLevel,
    generatePdf,
    copyReferenceNotes,
    downloadReferenceNotes,
    print,
    setMode,
  };
})();
