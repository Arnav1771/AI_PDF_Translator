document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  const translatedTextDiv = document.getElementById('translated-text'); // Get the div for translated text

  // Load saved settings when popup opens
  chrome.storage.sync.get(['apiKey', 'targetLanguage'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.targetLanguage) {
      targetLanguageSelect.value = result.targetLanguage;
    }
    statusDiv.textContent = 'Settings loaded.';
  });

   // Load and display last translation result if available
   chrome.storage.local.get(['lastTranslation'], (result) => {
    if (result.lastTranslation) {
      translatedTextDiv.textContent = `Last Translation:\n${result.lastTranslation}`;
    } else {
      translatedTextDiv.textContent = 'No translation performed yet.';
    }
  });


  // Save settings when button is clicked
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const targetLanguage = targetLanguageSelect.value;

    if (!apiKey) {
        statusDiv.textContent = 'Error: API Key cannot be empty.';
        statusDiv.style.color = 'red';
        return;
    }

    chrome.storage.sync.set({ apiKey, targetLanguage }, () => {
      statusDiv.textContent = 'Settings saved successfully!';
      statusDiv.style.color = 'green';
      setTimeout(() => {
         statusDiv.textContent = 'Ready to translate PDFs';
         statusDiv.style.color = 'black'; // Reset color
      }, 2000); // Clear message after 2 seconds
    });
  });

  // Optional: Add listener for test page button if it exists
  const openTestButton = document.getElementById('openTest');
  if (openTestButton) {
      openTestButton.addEventListener('click', () => {
        // Assuming test.html exists in your extension directory
        chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
      });
  }
});