# TECHSPEC.md – TranslateExt Technical Specification

## Overview

TranslateExt is a **Chrome Extension (Manifest V3)** that lets users translate any selected text — especially inside PDFs — directly in the browser using **Google Gemini AI**. Results appear in a draggable, resizable, copyable in-page panel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (MV3)                                         │
│                                                                  │
│  ┌──────────────┐    Context Menu Click / Message               │
│  │ background.js│ ──────────────────────────────────────────┐   │
│  │ (SW)         │                                           │   │
│  │              │  chrome.storage.sync (apiKey, lang)       │   │
│  │              │  ↓ fetch()                                │   │
│  │              │  Gemini API  ─────────────────────────┐   │   │
│  │              │       ↑ HTTPS                         │   │   │
│  │              │  ← response                           │   │   │
│  │              │  chrome.tabs.sendMessage ─────────────┘   │   │
│  └──────────────┘    translationResult / Error / Loading       │
│          ↑                    ↓                                 │
│  chrome.contextMenus    ┌─────────────────────────────────┐    │
│  chrome.runtime.onMsg   │  content.js (injected per tab)  │    │
│                         │  - renders panel DOM             │    │
│                         │  - draggable/resizable           │    │
│                         │  - copy to clipboard             │    │
│                         └─────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ popup.html   │  Settings (apiKey, targetLanguage)            │
│  │ popup.js     │  chrome.storage.sync                          │
│  │ popup.css    │  History display (chrome.storage.local)       │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Chrome Extension MV3 (Service Worker) |
| Language | Vanilla JavaScript (ES2022) |
| AI Backend | Google Gemini API (`gemini-2.0-flash`) |
| Storage | `chrome.storage.sync` (settings), `chrome.storage.local` (history) |
| Styling | Plain CSS3 (no framework) |
| Build | None — zero build step, load unpacked directly |

---

## File Map

```
AI_PDF_Translator/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker: context menu, Gemini API, history
├── content.js             # Content script: panel UI, message handling
├── chat-ui.css            # Content panel styles (injected via manifest)
├── popup.html             # Toolbar popup markup
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── test.html              # Dev-only test page
├── create_icons.js        # Node script to generate placeholder icons
├── icons/icon.js          # Alternate icon generation script
├── images/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .env.example           # Env template (extension ignores at runtime)
├── .gitignore
├── HANDOFF.md
├── TECHSPEC.md
└── README.md
```

---

## Data Flow

### Translation Request
1. User selects text on any page → right-clicks → "Translate with TranslateExt"
2. `background.js` `contextMenus.onClicked` fires with `info.selectionText` and `tab.id`
3. Background reads `apiKey` + `targetLanguage` from `chrome.storage.sync`
4. Language code resolved to full name via `LANGUAGE_NAMES` map (e.g. `"en"` → `"English"`)
5. `translationLoading` message sent to content script → panel opens with spinner
6. `fetch()` to Gemini API endpoint with constructed prompt
7. On success: `translationResult` message sent to content script; history updated in `storage.local`
8. On error: `translationError` message sent; friendly error shown in panel; Chrome notification fired

### Settings Flow
- User opens popup → `popup.js` reads `chrome.storage.sync` → pre-fills form
- User clicks Save → values written to `chrome.storage.sync`

### History Flow
- Each successful translation prepended to `history` array in `chrome.storage.local`
- Array capped at 10 entries
- Popup displays last 5 entries on open

---

## API Contract

### Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Auth**: `?key=<GEMINI_API_KEY>` query param
- **Method**: POST
- **Body**:
  ```json
  {
    "contents": [{
      "parts": [{ "text": "Translate the following text to English..." }]
    }]
  }
  ```
- **Response path**: `data.candidates[0].content.parts[0].text`

### Chrome Message Protocol (background ↔ content)

| Action | Direction | Payload |
|--------|-----------|---------|
| `translationLoading` | BG → Content | `{ original: string, language: string }` |
| `translationResult` | BG → Content | `{ original: string, translation: string, language: string }` |
| `translationError` | BG → Content | `{ message: string }` |
| `translate` (legacy) | Content → BG | `{ text: string }` |

### Storage Schema

**`chrome.storage.sync`** (per-profile, synced):
```json
{
  "apiKey": "string",
  "targetLanguage": "string (ISO code, e.g. 'en')"
}
```

**`chrome.storage.local`** (per-device):
```json
{
  "history": [
    {
      "original": "string",
      "translation": "string",
      "language": "string (full name, e.g. 'English')",
      "ts": "number (unix ms)"
    }
  ]
}
```

---

## Environment Setup

### Prerequisites
- Google Chrome (v110+)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Node.js (only needed for icon generation script)

### Install (Developer Mode)
```bash
git clone https://github.com/Arnav1771/AI_PDF_Translator.git
cd AI_PDF_Translator
```
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the cloned folder
4. Click the TranslateExt icon in the toolbar
5. Enter your Gemini API key and select a target language → **Save Settings**

### Icon Generation (optional)
```bash
node create_icons.js
```
Generates placeholder 16/48/128px PNGs in `images/`. Replace with proper artwork before publishing.

---

## Permissions Rationale

| Permission | Why |
|-----------|-----|
| `storage` | Save API key and translation history |
| `contextMenus` | "Translate with TranslateExt" right-click item |
| `notifications` | Error alerts |
| `scripting` | Inject content script programmatically if needed |
| `activeTab` | Send messages to the active tab |
| `tabs` | Send messages to a specific tab after translation |
| `host_permissions: generativelanguage.googleapis.com` | Allow `fetch()` to Gemini API from service worker |

---

## Deployment Notes

1. **Chrome Web Store**: Run `zip -r translateext.zip . --exclude "*.git*" --exclude "node_modules/*"`. Submit at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. **No build step**: Pure vanilla JS + CSS, no bundler or transpiler needed.
3. **API key management**: Keys are stored per-user in `chrome.storage.sync` and never committed to source. The `.env.example` file is for future build/test scripts only.
4. **Versioning**: Bump `version` in `manifest.json` for every release; Chrome Web Store requires a version increment on each upload.
5. **Testing in CI**: Use `puppeteer` + `puppeteer-extra-plugin-chrome-extension` or the `web-ext` CLI for automated integration tests.

---

## Security Notes

- The Gemini API key is sent as a URL query parameter per the Gemini API spec. This is safe over HTTPS but means the key will appear in browser network logs. Users should treat it as a low-sensitivity credential and can rotate it freely in AI Studio.
- No content is sent to any server other than `generativelanguage.googleapis.com`.
- The content script uses `textContent` for all user-supplied strings (never `innerHTML`) to prevent XSS.
- `escapeHtml()` is used wherever HTML is assembled from user data.
