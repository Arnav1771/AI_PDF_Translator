# TranslateExt - PDF Translator

TranslateExt is a Chrome extension that translates selected text in PDFs using the Gemini API.

## Features

- Right-click selected text in a PDF and translate it instantly.
- Supports multiple target languages.
- Stores your Gemini API key securely.
- Displays the last translation in the popup.

## Setup

1. Clone this repository.
2. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install dependencies (if you want to use the icon generation script):
   ```
   npm install
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder.

## Usage

1. Enter your Gemini API key and select your target language in the popup.
2. Open a PDF in Chrome.
3. Select text, right-click, and choose "Translate with TranslateExt".
4. The translation will appear as a notification and in the popup.

## Development

- `background.js`: Handles context menu and translation requests.
- `content.js`: Handles UI and communication with the background script.
- `popup.html` / `popup.js`: Extension popup for settings and last translation.
- `test.html`: Test page for development.

## License

MIT License.