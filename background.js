// TranslateExt Background Service Worker (MV3)

// Language code -> full name map (matches popup.html select values)
const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese (Simplified)',
  ru: 'Russian', ar: 'Arabic', hi: 'Hindi', pt: 'Portuguese',
  nl: 'Dutch', pl: 'Polish', sv: 'Swedish', tr: 'Turkish',
  vi: 'Vietnamese', th: 'Thai', cs: 'Czech', el: 'Greek',
  he: 'Hebrew', id: 'Indonesian', ro: 'Romanian', uk: 'Ukrainian',
  fa: 'Persian'
};

const GEMINI_MODEL = 'gemini-2.0-flash';
const ICON_URL = 'images/icon48.png';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateText',
    title: 'Translate with TranslateExt',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateText' && info.selectionText && tab?.id) {
    handleTranslation(info.selectionText, tab.id);
  }
});

// Listen for translate requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate' && request.text && sender.tab?.id) {
    handleTranslation(request.text, sender.tab.id);
    sendResponse({ status: 'processing' });
  }
  return true;
});

async function handleTranslation(selectedText, tabId) {
  const { apiKey, targetLanguage } = await chrome.storage.sync.get(['apiKey', 'targetLanguage']);
  const langCode = targetLanguage || 'en';
  const langName = LANGUAGE_NAMES[langCode] || langCode;

  if (!apiKey) {
    notifyTab(tabId, {
      action: 'translationError',
      message: 'No API key set. Open the TranslateExt popup to enter your Gemini API key.'
    });
    showNotification('TranslateExt – No API Key', 'Open the extension popup and enter your Gemini API key.');
    return;
  }

  // Notify content script: translation is loading
  notifyTab(tabId, { action: 'translationLoading', original: selectedText, language: langName });

  const prompt = `Translate the following text to ${langName}. Output only the translated text, preserving any formatting. The text is:\n\n"${selectedText}"`;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      const friendlyMsg = getFriendlyError(errMsg, response.status);
      notifyTab(tabId, { action: 'translationError', message: friendlyMsg });
      showNotification('TranslateExt – Translation Error', friendlyMsg);
      return;
    }

    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translatedText) {
      notifyTab(tabId, { action: 'translationError', message: 'Unexpected API response. Please try again.' });
      return;
    }

    // Send result to content script
    notifyTab(tabId, {
      action: 'translationResult',
      original: selectedText,
      translation: translatedText,
      language: langName
    });

    // Save last translation for popup display
    const entry = { original: selectedText, translation: translatedText, language: langName, ts: Date.now() };
    const { history = [] } = await chrome.storage.local.get('history');
    history.unshift(entry);
    await chrome.storage.local.set({ history: history.slice(0, 10) });

  } catch (err) {
    const msg = err.message || 'Network error. Check your internet connection.';
    notifyTab(tabId, { action: 'translationError', message: msg });
    showNotification('TranslateExt – Error', msg);
  }
}

function notifyTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: ICON_URL,
    title,
    message: message.substring(0, 200)
  });
}

function getFriendlyError(msg, status) {
  if (status === 400) return 'Invalid request. Your API key may be malformed.';
  if (status === 401 || status === 403) return 'Invalid or unauthorized API key. Check your key in the popup.';
  if (status === 429) return 'Rate limit reached. Please wait a moment before translating again.';
  if (status === 500 || status === 503) return 'Gemini API is temporarily unavailable. Try again later.';
  if (msg.toLowerCase().includes('quota')) return 'API quota exceeded. Check your Google AI Studio usage.';
  return msg.substring(0, 150);
}
