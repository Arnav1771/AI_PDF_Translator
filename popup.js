// TranslateExt Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const langSelect  = document.getElementById('targetLanguage');
  const saveBtn     = document.getElementById('save');
  const statusDiv   = document.getElementById('status');
  const toggleKey   = document.getElementById('toggleKey');
  const clearBtn    = document.getElementById('clearHistory');
  const historyList = document.getElementById('history-list');
  const howCard     = document.getElementById('how-card');
  const howToggle   = document.getElementById('howToggle');

  // ── Load saved settings ───────────────────────────────
  chrome.storage.sync.get(['apiKey', 'targetLanguage'], ({ apiKey, targetLanguage }) => {
    if (apiKey) apiKeyInput.value = apiKey;
    if (targetLanguage) langSelect.value = targetLanguage;
  });

  // ── Load history ──────────────────────────────────────
  loadHistory();

  // ── Show / hide API key ───────────────────────────────
  toggleKey.addEventListener('click', () => {
    const isHidden = apiKeyInput.type === 'password';
    apiKeyInput.type = isHidden ? 'text' : 'password';
    toggleKey.innerHTML = isHidden ? '&#128065;&#xFE0E;' : '&#128065;';
  });

  // ── Save settings ─────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      setStatus('API key cannot be empty.', 'error');
      return;
    }
    chrome.storage.sync.set({ apiKey: key, targetLanguage: langSelect.value }, () => {
      setStatus('Settings saved!', 'success');
      setTimeout(() => setStatus('', ''), 2500);
    });
  });

  // ── Clear history ─────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ history: [] }, loadHistory);
  });

  // ── Collapsible how-to ────────────────────────────────
  howToggle.addEventListener('click', () => {
    howCard.classList.toggle('open');
  });

  // ── Helpers ───────────────────────────────────────────
  function setStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = 'status-msg' + (type ? ' ' + type : '');
  }

  function loadHistory() {
    chrome.storage.local.get(['history'], ({ history }) => {
      historyList.innerHTML = '';
      if (!history || history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No translations yet. Select text on any page, right-click, and choose <em>Translate with TranslateExt</em>.</p>';
        return;
      }
      history.slice(0, 5).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div class="history-lang">${escapeHtml(entry.language || '')}</div>
          <div class="history-original">${escapeHtml(truncate(entry.original || '', 80))}</div>
          <div class="history-translation">${escapeHtml(truncate(entry.translation || '', 120))}</div>
        `;
        historyList.appendChild(item);
      });
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '…' : str;
  }
});
