# TranslateExt - PDF Translator

TranslateExt is a Chrome extension that translates selected text in PDFs using the Gemini API.

## Features

- Right-click selected text in a PDF and translate it instantly.
- Supports multiple target languages.
- Stores your Gemini API key securely.
- Displays the last translation in the popup.

## Setup

1. Clone this repository.
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder.
3. Click the TranslateExt icon in the toolbar, enter your [Gemini API key](https://aistudio.google.com/app/apikey), select a target language, and click **Save Settings**.

> **Note:** The API key is stored securely in Chrome's `storage.sync` and is never committed to source code.
> If you use a build or test script, copy `.env.example` to `.env` and fill in your key — this file is git-ignored.

## Usage

1. Open a PDF (or any web page) in Chrome.
2. Select text, right-click, and choose "Translate with TranslateExt".
3. The translation appears in a new pop-up window. The last result is also shown next time you open the popup.

## Development

- `background.js`: Handles context menu and translation requests.
- `content.js`: Handles UI and communication with the background script.
- `popup.html` / `popup.js`: Extension popup for settings and last translation.
- `test.html`: Test page for development.

## License

MIT License.