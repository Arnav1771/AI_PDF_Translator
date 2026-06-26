# TranslateExt – AI PDF Translator

> **Translate selected text anywhere in Chrome — especially PDFs — with one right-click, powered by Google Gemini AI.**

---

## Features

- **Right-click to translate** — select any text, right-click, choose "Translate with TranslateExt"
- **Beautiful in-page panel** — draggable, resizable, with side-by-side original / translation bubbles
- **Copy button** — copy the translation to clipboard instantly
- **25+ languages** — English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Hindi, and more
- **Translation history** — last 5 translations visible in the popup (10 stored locally)
- **Friendly error messages** — clear guidance for invalid keys, rate limits, and quota issues
- **PDF hint banner** — auto-shows on PDF pages with usage instructions
- **Ctrl+Shift+D diagnostics** — quick health check panel on any page
- **Powered by `gemini-2.0-flash`** — fast, accurate, multilingual

---

## Setup

1. **Clone** this repository (or download the ZIP)
2. **Open** `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select this folder
5. Click the **TranslateExt icon** in the Chrome toolbar
6. **Get a free Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)
7. Paste your key, pick a target language, click **Save Settings**

---

## Usage

1. Open any web page or PDF in Chrome
2. Select the text you want to translate
3. Right-click → **"Translate with TranslateExt"**
4. A panel slides in at the top-right with your translation
5. Click the copy button (⌘) to copy the translation to clipboard
6. Drag the panel header to reposition; drag the corner to resize

---

## File Structure

| File | Role |
|------|------|
| `manifest.json` | Extension manifest (MV3) |
| `background.js` | Service worker — context menu, Gemini API, history |
| `content.js` | Content script — translation panel UI |
| `chat-ui.css` | Panel styles (auto-injected into all pages) |
| `popup.html` | Toolbar popup |
| `popup.js` / `popup.css` | Popup logic and styles |
| `images/` | Extension icons (16/48/128 px) |
| `HANDOFF.md` | Audit log — bugs found and fixed |
| `TECHSPEC.md` | Full technical specification |

---

## Development

### Prerequisites
- Chrome 110+
- [Google AI Studio API key](https://aistudio.google.com/app/apikey) (free)
- Node.js (optional — only for icon generation)

### Regenerate icons
```bash
node create_icons.js
```

### Reload after edits
In `chrome://extensions/` click the **↺** refresh button on the TranslateExt card, then reload the page you are testing on.

### Diagnostics
Press **Ctrl+Shift+D** on any page to open the diagnostics panel — shows extension status, whether you are on a PDF, and API key presence.

---

## Security

- Your API key is stored in `chrome.storage.sync` (encrypted by Chrome, synced to your Google account)
- No data is sent anywhere except `generativelanguage.googleapis.com` (Gemini API)
- All user text is rendered with `textContent` / `escapeHtml()` — no XSS risk
- The `.env.example` file is for build scripts only; the extension never reads it

---

## License

MIT
