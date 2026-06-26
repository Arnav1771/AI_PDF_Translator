// TranslateExt Content Script

let isExtensionValid = true;

// ─── Translation Panel ────────────────────────────────────────────────────────

function getOrCreatePanel() {
  let panel = document.getElementById('translateext-panel');
  if (panel) return { panel, isNew: false };

  panel = document.createElement('div');
  panel.id = 'translateext-panel';
  panel.innerHTML = `
    <div id="translateext-header">
      <span id="translateext-lang-badge"></span>
      <span id="translateext-title">TranslateExt</span>
      <div id="translateext-header-actions">
        <button id="translateext-copy-btn" title="Copy translation">&#x2398;</button>
        <button id="translateext-close-btn" title="Close">&times;</button>
      </div>
    </div>
    <div id="translateext-content-area"></div>
  `;

  document.body.appendChild(panel);
  makeDraggable(panel, panel.querySelector('#translateext-header'));
  makeResizable(panel);

  panel.querySelector('#translateext-close-btn').addEventListener('click', () => panel.remove());
  panel.querySelector('#translateext-copy-btn').addEventListener('click', () => {
    const lastTranslation = panel.dataset.lastTranslation || '';
    if (lastTranslation) {
      navigator.clipboard.writeText(lastTranslation).then(() => {
        const btn = panel.querySelector('#translateext-copy-btn');
        btn.textContent = '✓';
        setTimeout(() => { btn.innerHTML = '&#x2398;'; }, 1500);
      }).catch(() => {});
    }
  });

  return { panel, isNew: true };
}

function addMessage(contentArea, text, type) {
  // Remove any existing loading message
  const loading = contentArea.querySelector('.translateext-message-loading');
  if (loading) loading.remove();

  const bubble = document.createElement('div');
  bubble.className = `translateext-message translateext-message-${type}`;

  if (type === 'loading') {
    bubble.innerHTML = `<span class="translateext-loading-text">${escapeHtml(text)}</span><span class="translateext-spinner"></span>`;
    bubble.classList.add('translateext-message-loading');
  } else if (type === 'error') {
    bubble.textContent = text;
  } else {
    // Preserve newlines
    text.split('\n').forEach((line, i, arr) => {
      bubble.appendChild(document.createTextNode(line));
      if (i < arr.length - 1) bubble.appendChild(document.createElement('br'));
    });
  }

  const ts = document.createElement('span');
  ts.className = 'translateext-timestamp';
  const now = new Date();
  ts.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  bubble.appendChild(ts);

  contentArea.appendChild(bubble);
  contentArea.scrollTop = contentArea.scrollHeight;
  return bubble;
}

// ─── Message Listener (from background) ──────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isExtensionValid) return;

  if (request.action === 'translationLoading') {
    const { panel } = getOrCreatePanel();
    const contentArea = panel.querySelector('#translateext-content-area');

    // Original text bubble
    const origBubble = document.createElement('div');
    origBubble.className = 'translateext-message translateext-message-original';
    origBubble.textContent = truncate(request.original, 200);
    const origTs = document.createElement('span');
    origTs.className = 'translateext-timestamp';
    const now = new Date();
    origTs.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    origBubble.appendChild(origTs);
    contentArea.appendChild(origBubble);

    addMessage(contentArea, 'Translating…', 'loading');

    // Update language badge
    const badge = panel.querySelector('#translateext-lang-badge');
    if (badge) badge.textContent = request.language || '';

    panel.style.display = 'flex';
    contentArea.scrollTop = contentArea.scrollHeight;
  }

  if (request.action === 'translationResult') {
    const { panel } = getOrCreatePanel();
    const contentArea = panel.querySelector('#translateext-content-area');
    addMessage(contentArea, request.translation, 'translation');

    // Store for copy
    panel.dataset.lastTranslation = request.translation;

    // Update badge
    const badge = panel.querySelector('#translateext-lang-badge');
    if (badge) badge.textContent = request.language || '';
  }

  if (request.action === 'translationError') {
    const { panel } = getOrCreatePanel();
    const contentArea = panel.querySelector('#translateext-content-area');
    addMessage(contentArea, request.message, 'error');
  }

  sendResponse({ ok: true });
  return true;
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '…' : str;
}

function makeDraggable(element, handle) {
  let ox = 0, oy = 0, sx = 0, sy = 0;
  handle.style.cursor = 'move';
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    sx = e.clientX; sy = e.clientY;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag, { once: true });
  });
  function drag(e) {
    ox = sx - e.clientX; oy = sy - e.clientY;
    sx = e.clientX; sy = e.clientY;
    element.style.top = (element.offsetTop - oy) + 'px';
    element.style.left = (element.offsetLeft - ox) + 'px';
    element.style.right = 'auto';
  }
  function stopDrag() {
    document.removeEventListener('mousemove', drag);
  }
}

function makeResizable(element) {
  const handle = document.createElement('div');
  handle.id = 'translateext-resize-handle';
  element.appendChild(handle);
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startW = element.offsetWidth, startH = element.offsetHeight;
    function resize(e) {
      element.style.width = Math.max(280, startW + e.clientX - startX) + 'px';
      element.style.height = Math.max(200, startH + e.clientY - startY) + 'px';
    }
    function stop() {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stop);
    }
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stop);
  });
}

// ─── PDF hint banner (shows once per PDF session) ─────────────────────────────

function isPdfPage() {
  return window.location.href.toLowerCase().includes('.pdf') ||
    document.contentType === 'application/pdf' ||
    !!document.querySelector('embed[type="application/pdf"], object[type="application/pdf"]');
}

function showPdfHint() {
  if (document.getElementById('translateext-pdf-hint')) return;
  const hint = document.createElement('div');
  hint.id = 'translateext-pdf-hint';
  hint.innerHTML = `
    <strong>TranslateExt Active</strong>
    <p style="margin:4px 0 8px">Select text, then right-click → <em>Translate with TranslateExt</em></p>
    <button id="translateext-hint-close">Got it</button>
  `;
  document.body.appendChild(hint);
  const close = () => hint.remove();
  document.getElementById('translateext-hint-close').addEventListener('click', close);
  setTimeout(close, 8000);
}

// ─── Diagnostics (Ctrl+Shift+D) ───────────────────────────────────────────────

function showDiagnosticPanel() {
  const existing = document.getElementById('translateext-diag');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'translateext-diag';
  panel.innerHTML = `
    <h3 style="margin:0 0 8px">TranslateExt Diagnostics</h3>
    <p>Extension: <strong style="color:#4caf50">Active</strong></p>
    <p>PDF page: <strong id="diag-pdf"></strong></p>
    <p>API Key: <strong id="diag-key">checking…</strong></p>
    <button id="diag-close" style="margin-top:8px">Close</button>
  `;
  Object.assign(panel.style, {
    position: 'fixed', bottom: '20px', left: '20px', background: '#fff',
    border: '1px solid #ccc', padding: '16px', borderRadius: '8px',
    zIndex: '2147483647', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
    fontFamily: 'sans-serif', fontSize: '13px', minWidth: '240px'
  });

  document.body.appendChild(panel);
  panel.querySelector('#diag-pdf').textContent = isPdfPage() ? 'Yes' : 'No';
  panel.querySelector('#diag-pdf').style.color = isPdfPage() ? '#4caf50' : '#f44336';
  panel.querySelector('#diag-close').addEventListener('click', () => panel.remove());

  chrome.storage.sync.get(['apiKey'], ({ apiKey }) => {
    const el = panel.querySelector('#diag-key');
    el.textContent = apiKey ? 'Set' : 'Not set – open popup';
    el.style.color = apiKey ? '#4caf50' : '#f44336';
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (isPdfPage()) showPdfHint();

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      showDiagnosticPanel();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle extension context invalidation
window.addEventListener('unload', () => {
  isExtensionValid = false;
});
