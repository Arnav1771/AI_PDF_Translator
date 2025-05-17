// Background script for TranslateExt

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateText",
    title: "Translate with TranslateExt",
    contexts: ["selection"] // Show only when text is selected
  });
});

// Listen for context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateText" && info.selectionText) {
    translateSelectedText(info.selectionText);
  }
});

async function translateSelectedText(selectedText) {
  // Get API key and target language from storage
  chrome.storage.sync.get(['apiKey', 'targetLanguage'], async (result) => {
    const apiKey = result.apiKey;
    const targetLanguage = result.targetLanguage || 'en'; // Default to English if not set

    if (!apiKey) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png', // Use your icon path
        title: 'TranslateExt Error',
        message: 'Gemini API Key not set. Please set it in the extension popup.'
      });
      // Optionally open the popup
      // chrome.action.openPopup();
      return;
    }

    // Prepare the prompt for Gemini
    const prompt = `Translate the following text to ${targetLanguage}. Output only the translated text, without any introductory phrases or explanations. The text is:\n\n"${selectedText}"`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorData?.error?.message || ''}`);
      }

      const data = await response.json();

      // Extract the translated text - adjust based on actual Gemini response structure
      let translatedText = "Translation not found in response.";
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
         translatedText = data.candidates[0].content.parts[0].text.trim();
      } else {
         console.warn("Unexpected API response structure:", data);
      }

      // Display the translation in a notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png', // Use your icon path
        title: `Translation to ${targetLanguage}`,
        message: translatedText,
        priority: 2 // Higher priority
      });

       // Optional: Store last translation for popup display
       chrome.storage.local.set({ lastTranslation: translatedText });

    } catch (error) {
      console.error('Translation Error:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png', // Use your icon path
        title: 'TranslateExt Error',
        message: `Failed to translate: ${error.message}`
      });
       // Optional: Clear last translation on error
       chrome.storage.local.remove('lastTranslation');
    }
  });
}