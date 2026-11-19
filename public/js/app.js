/**
 * MyPrinter — Main Application Controller
 * Handles navigation, toast notifications, and shared utilities
 */

window.MyPrinter = (() => {
  let currentPage = 'landing';
  let currentSession = null;

  // ---- API Helper ----
  async function api(url, options = {}) {
    const defaults = {
      headers: { 'Content-Type': 'application/json' },
    };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
    }
    if (options.body instanceof FormData) {
      delete defaults.headers['Content-Type'];
    }
    const res = await fetch(url, { ...defaults, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---- Toast Notifications ----
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `
      <span>${icons[type] || 'ℹ'}</span>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // ---- Loading Overlay ----
  function showLoading(message = 'Processing...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner spinner-lg"></div>
      <div class="loading-text">${message}</div>
    `;
    document.body.appendChild(overlay);
  }

  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  }

  // ---- Navigation ----
  function navigateHome() {
    // End current session if exists
    if (currentSession) {
      endCurrentSession();
    }
    currentPage = 'landing';
    renderLanding();
  }

  function navigateTo(system) {
    currentPage = system;
    switch (system) {
      case 'imgtodoc':
        window.ImgToDoc.init();
        break;
      case 'txttodoc':
        window.TxtToDoc.init();
        break;
      case 'duplexprint':
        window.DuplexPrint.init();
        break;
      case 'docprinter':
        window.DocPrinter.init();
        break;
      default:
        renderLanding();
    }
  }

  async function endCurrentSession() {
    if (!currentSession) return;
    try {
      await api(`/api/${currentPage}/end`, {
        method: 'POST',
        body: { sessionId: currentSession },
      });
    } catch (e) {
      // Ignore errors on session end
    }
    currentSession = null;
  }

  // ---- Printer Status ----
  async function checkPrinter() {
    try {
      const data = await api('/api/printer/status');
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('printer-status-text');
      
      if (data.canon && data.canon.found) {
        dot.className = 'status-dot ready';
        text.textContent = `Canon G3770 (${data.canon.ip || '192.168.0.111'})`;
      } else if (data.allPrinters && data.allPrinters.length > 0) {
        dot.className = 'status-dot ready';
        text.textContent = data.allPrinters[0].name;
      } else {
        dot.className = 'status-dot error';
        text.textContent = 'No printer found';
      }
    } catch (e) {
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('printer-status-text');
      if (dot) dot.className = 'status-dot error';
      if (text) text.textContent = 'Offline';
    }
  }

  // ---- Landing Page ----
  function renderLanding() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="landing-page">
        <div class="landing-hero">
          <h1>MyPrinter</h1>
          <p>Your smart printing studio. Search images, format text, optimize documents — all designed for ink-efficient, beautiful prints.</p>
        </div>
        
        <div class="systems-grid">
          <div class="system-card" onclick="window.MyPrinter.navigateTo('imgtodoc')" id="card-imgtodoc">
            <div class="system-card-icon img">📸</div>
            <h3>ImgToDoc</h3>
            <p>Search, download, and arrange images on A4 pages. Auto-fit with captions, optimized for ink-efficient color printing.</p>
            <span class="system-card-tag tag-color">Color Default</span>
          </div>
          
          <div class="system-card" onclick="window.MyPrinter.navigateTo('txttodoc')" id="card-txttodoc">
            <div class="system-card-icon txt">📝</div>
            <h3>TxtToDoc</h3>
            <p>Paste text, auto-enhance and structure it, then generate print-ready A4 with single or two-sided (duplex) printing.</p>
            <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
              <span class="system-card-tag tag-bw">B/W Default</span>
              <span class="system-card-tag" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);">📖 Both-Side Printing</span>
            </div>
          </div>
          
          <div class="system-card" onclick="window.MyPrinter.navigateTo('duplexprint')" id="card-duplexprint">
            <div class="system-card-icon duplex">📄</div>
            <h3>DuplexPrint</h3>
            <p>Manual two-sided printing for Canon G3770. Splits pages into odd/even sets for easy flip-and-print workflow.</p>
            <span class="system-card-tag tag-bw">B/W Default</span>
          </div>
          
          <div class="system-card" onclick="window.MyPrinter.navigateTo('docprinter')" id="card-docprinter">
            <div class="system-card-icon doc">🖨️</div>
            <h3>DocPrinter</h3>
            <p>Drag & drop any PDF. Analyzes content, recommends color/B&W, and optimizes for minimal ink usage before printing.</p>
            <span class="system-card-tag tag-bw">B/W Default</span>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Format file size ----
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ---- Initialize ----
  function init() {
    renderLanding();
    checkPrinter();
  }

  // Boot up
  document.addEventListener('DOMContentLoaded', init);

  return {
    api,
    showToast,
    showLoading,
    hideLoading,
    navigateHome,
    navigateTo,
    checkPrinter,
    formatSize,
    get currentSession() { return currentSession; },
    set currentSession(v) { currentSession = v; },
  };
})();
