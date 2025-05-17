// Content script for TranslateExt - PDF Translator

let isExtensionValid = true;
let debugMode = true; // Enable debugging

// Debug logging function
function debugLog(...args) {
  if (debugMode) {
    console.log("%cPDF Translator Debug:", "color: #4285F4; font-weight: bold", ...args);
  }
}

// Function to handle text selection
function handleTextSelection(event) {
  if (!isExtensionValid) return;
  
  try {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && event.button === 0) { // Left click
      debugLog('Text selected:', selectedText.substring(0, 50) + '...');
      
      // Show immediate feedback that text was selected
      showSelectionNotification(selectedText);
      
      chrome.runtime.sendMessage({ 
        action: 'translate', 
        text: selectedText 
      }, response => {
        // Log if message was received by background
        debugLog('Message sent to background. Response:', response);
        
        // If no response, there might be an issue with the background script
        if (!response) {
          debugLog('No response from background script. Testing direct translation...');
          // Try direct translation as fallback
          translateDirectly(selectedText);
        }
      });
    }
  } catch (error) {
    console.error('PDF Translator: Error handling selection:', error);
    if (error.message.includes('Extension context invalidated')) {
      handleExtensionInvalidation();
    }
  }
}

// Add a notification to show that text was selected
function showSelectionNotification(text) {
  let notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = `Text selected! Translating: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Function to open translation in a new window
function openTranslationInNewWindow(originalText, translatedText, isError = false) {
  debugLog('Opening translation in new window');
  
  // Create window features
  const width = 800;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  
  // Open new window
  const newWindow = window.open('', 'translateext_result', features);
  
  if (!newWindow) {
    alert('Pop-up blocked! Please allow pop-ups for this site to see translations in a new window.');
    return;
  }
  
  // Prepare content for the new window
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TranslateExt - Translation Result</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 20px;
        }
        h1 {
          color: #4285F4;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-top: 0;
        }
        .panel {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 5px;
        }
        .original {
          background-color: #f8f9fa;
          border-left: 4px solid #4285F4;
        }
        .translation {
          background-color: #f0f7ff;
          border-left: 4px solid #34A853;
        }
        .error {
          background-color: #fff0f0;
          border-left: 4px solid #EA4335;
          color: #EA4335;
        }
        h2 {
          margin-top: 0;
          font-size: 18px;
          color: #555;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-family: inherit;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>TranslateExt Translation Results</h1>
        
        <div class="panel original">
          <h2>Original Text</h2>
          <pre>${escapeHtml(originalText)}</pre>
        </div>
        
        ${isError ? 
          `<div class="panel error">
            <h2>Translation Error</h2>
            <p>${escapeHtml(translatedText)}</p>
          </div>` : 
          `<div class="panel translation">
            <h2>English Translation</h2>
            <pre>${escapeHtml(translatedText)}</pre>
          </div>`
        }
      </div>
    </body>
    </html>
  `;
  
  // Write content to the new window
  newWindow.document.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Direct translation function for testing and fallback
function translateDirectly(text) {
  debugLog('Attempting direct translation of:', text.substring(0, 30) + '...');
  
  // Use your actual API key here or get it from storage
  const GEMINI_API_KEY = 'AIzaSyAEyTjstC9Wl2b5vqVTT_dL4Z7jSmbalY8';
  
  if (GEMINI_API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
    console.error('ERROR: You must set a real Gemini API key in content.js');
    showTranslationResult('ERROR: You need to set a real Gemini API key in content.js file before translations will work!', true);
    return;
  }
  
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  const prompt = `Translate the following text to English, preserving the formatting and structure: "${text}"`;
  
  // Show a loading indicator
  showTranslationResult('Translating... Please wait...', false, true);
  
  fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  })
  .then(response => {
    debugLog('API Response status:', response.status);
    return response.json();
  })
  .then(data => {
    debugLog('API Response data:', data);
    if (data.error) {
      logTestResult(text, null, data.error);
      // Open in new window with error
      openTranslationInNewWindow(text, 'Translation error: ' + data.error.message, true);
    } else {
      const translatedText = data.candidates[0].content.parts[0].text;
      logTestResult(text, translatedText);
      // Open in new window with result
      openTranslationInNewWindow(text, translatedText);
    }
  })
  .catch(error => {
    debugLog('API Error:', error);
    logTestResult(text, null, error);
    // Open in new window with error
    openTranslationInNewWindow(text, 'Translation error: ' + error.message, true);
  });
}

function handleExtensionInvalidation() {
    isExtensionValid = false;
    // Clean up event listeners
    document.removeEventListener('mouseup', handleTextSelection);
}

// Add event listener using the named function
document.addEventListener('mouseup', handleTextSelection);

// Listen for extension invalidation
chrome.runtime.onSuspend.addListener(handleExtensionInvalidation);

// Check if the current page is a PDF
function isPdfPage() {
  return window.location.href.toLowerCase().includes('.pdf') || 
         document.contentType === 'application/pdf' || 
         document.querySelector('embed[type="application/pdf"]') !== null || 
         document.querySelector('object[type="application/pdf"]') !== null;
}

// Load CSS for chat UI
function loadChatUiStyles() {
  if (!document.getElementById('translateext-chat-styles')) {
    const link = document.createElement('link');
    link.id = 'translateext-chat-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('chat-ui.css');
    document.head.appendChild(link);
  }
}

// Make an element draggable
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Make an element resizable
function makeResizable(element) {
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'translateext-resize-handle';
  element.appendChild(resizeHandle);
  
  resizeHandle.addEventListener('mousedown', initResize, false);
  
  function initResize(e) {
    e.preventDefault();
    window.addEventListener('mousemove', resize, false);
    window.addEventListener('mouseup', stopResize, false);
  }
  
  function resize(e) {
    element.style.width = (e.clientX - element.getBoundingClientRect().left) + 'px';
    element.style.height = (e.clientY - element.getBoundingClientRect().top) + 'px';
  }
  
  function stopResize() {
    window.removeEventListener('mousemove', resize, false);
    window.removeEventListener('mouseup', stopResize, false);
  }
}

// Show translation result in a chat-like UI that preserves PDF formatting
function showTranslationResult(text, isError = false, isLoading = false) {
  console.log('Showing translation result:', isError ? 'ERROR' : (isLoading ? 'LOADING' : 'SUCCESS'));
  
  // Load CSS styles
  loadChatUiStyles();
  
  // Create or get existing result panel
  let resultPanel = document.getElementById('translateext-result-panel');
  let contentArea;
  let isNewPanel = false;
  
  if (!resultPanel) {
    console.log('Creating new result panel');
    isNewPanel = true;
    resultPanel = document.createElement('div');
    resultPanel.id = 'translateext-result-panel';
    
    // Make the panel more visible with explicit styles
    resultPanel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 350px;
      height: 400px;
      background: white;
      border: 2px solid #4285F4;
      border-radius: 8px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: translateext-pulse 1s 3;
    `;
    
    // Add animation to make it more noticeable
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes translateext-pulse {
        0% { box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        50% { box-shadow: 0 4px 30px rgba(66, 133, 244, 0.8); }
        100% { box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      }
    `;
    document.head.appendChild(styleElement);
    
    document.body.appendChild(resultPanel);
    
    // Create header
    const header = document.createElement('div');
    header.id = 'translateext-header';
    
    const title = document.createElement('h3');
    title.id = 'translateext-title';
    title.textContent = 'PDF Translation';
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'translateext-close-btn';
    closeBtn.innerHTML = '&times;';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    resultPanel.appendChild(header);
    
    // Create content area
    contentArea = document.createElement('div');
    contentArea.id = 'translateext-content-area';
    resultPanel.appendChild(contentArea);
    
    // Add test button
    const testBtn = document.createElement('button');
    testBtn.id = 'translateext-test-btn';
    testBtn.textContent = 'Run Test Translation';
    testBtn.style.cssText = `
      margin: 10px;
      padding: 8px;
      background: #4285F4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    testBtn.addEventListener('click', runTestTranslation);
    resultPanel.appendChild(testBtn);
    
    // Make panel draggable and resizable
    makeDraggable(resultPanel, header);
    makeResizable(resultPanel);
    
    // Add close button functionality
    closeBtn.addEventListener('click', function() {
      document.body.removeChild(resultPanel);
    });
    
    // Add instruction text for visibility
    const instructions = document.createElement('div');
    instructions.textContent = '👆 Your translation panel is here!';
    instructions.style.cssText = `
      position: fixed;
      top: 40px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 10001;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    document.body.appendChild(instructions);
    setTimeout(() => instructions.remove(), 5000);

    // Add error monitoring for notifications API
    if (chrome.notifications) {
      debugLog('Chrome notifications API is available in this extension');
      
      // Monitor for errors in the notifications API
      const originalCreate = chrome.notifications.create;
      if (originalCreate) {
        chrome.notifications.create = function(notificationId, options, callback) {
          debugLog('Notification creation attempted', options);
          if (options && options.iconUrl) {
            debugLog('Notification uses iconUrl:', options.iconUrl);
          }
          return originalCreate.apply(this, arguments);
        };
      }
    }
  } else {
    contentArea = document.getElementById('translateext-content-area');
  }
  
  // Store original text if it's not an error and not loading
  if (!isError && !isLoading && isNewPanel) {
    // Create original text bubble (only for the first message)
    const originalBubble = document.createElement('div');
    originalBubble.className = 'translateext-message translateext-original';
    const selectedText = window.getSelection().toString().trim();
    originalBubble.textContent = selectedText || "No text selected.";
    
    // Add timestamp to original text
    const origTimestamp = document.createElement('div');
    origTimestamp.className = 'translateext-timestamp';
    const origTime = new Date();
    origTimestamp.textContent = `${origTime.getHours().toString().padStart(2, '0')}:${origTime.getMinutes().toString().padStart(2, '0')}`;
    
    originalBubble.appendChild(origTimestamp);
    contentArea.appendChild(originalBubble);
  }
  
  // Create message bubble
  const messageBubble = document.createElement('div');
  messageBubble.className = isError ? 
    'translateext-message translateext-message-error' : 
    (isLoading ? 'translateext-message translateext-message-loading' : 'translateext-message translateext-message-translation');
  
  if (isLoading) {
    messageBubble.innerHTML = `${text} <div class="loading-spinner"></div>`;
  } else if (isError) {
    messageBubble.textContent = text;
  } else {
    // Preserve PDF formatting by maintaining line breaks and spacing
    messageBubble.innerHTML = text
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/ {2}/g, '&nbsp;&nbsp;');
  }
  
  // Add timestamp
  const timestamp = document.createElement('div');
  timestamp.className = 'translateext-timestamp';
  
  const now = new Date();
  timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  messageBubble.appendChild(timestamp);
  
  // If it's a loading message, store its reference for later updating
  if (isLoading) {
    messageBubble.id = 'translateext-loading-message';
  } else {
    // Remove any existing loading message
    const loadingMessage = document.getElementById('translateext-loading-message');
    if (loadingMessage) {
      contentArea.removeChild(loadingMessage);
    }
  }
  
  contentArea.appendChild(messageBubble);
  
  // Scroll to the bottom
  contentArea.scrollTop = contentArea.scrollHeight;
}

// Run a test translation
function runTestTranslation() {
  const testText = "Esto es un texto de prueba para la traducción. Por favor tradúcelo al inglés.";
  debugLog('Running test translation with text:', testText);
  translateDirectly(testText);
}

// Add test logging
function logTestResult(originalText, translatedText, error = null) {
  console.group('PDF Translator Test Results');
  console.log('Original Text:', originalText);
  console.log('Translated Text:', translatedText);
  if (error) console.error('Error:', error);
  console.groupEnd();
}

// Check extension status and show diagnostic panel
function showDiagnosticPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: white;
    border: 1px solid #ccc;
    padding: 15px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 350px;
  `;
  
  panel.innerHTML = `
    <h3>PDF Translator Diagnostics</h3>
    <p>Extension status: <span style="color: green; font-weight: bold;">Active</span></p>
    <p>On PDF page: <span style="color: ${isPdfPage() ? 'green' : 'red'}; font-weight: bold;">${isPdfPage() ? 'Yes' : 'No'}</span></p>
    <p>API Key set: <span style="color: green; font-weight: bold;">Yes</span></p>
    <button id="test-translation-btn" style="background: #4285F4; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Run Test Translation</button>
    <button id="close-diagnostic-btn" style="margin-left: 10px; background: #ccc; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Close</button>
  `;
  
  document.body.appendChild(panel);
  
  document.getElementById('test-translation-btn').addEventListener('click', runTestTranslation);
  document.getElementById('close-diagnostic-btn').addEventListener('click', () => panel.remove());
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Received message in content script:', request);
  
  if (request.action === 'translate') {
    const selectedText = request.text;
    
    // Test mode logging
    debugLog('Translation requested for:', selectedText);
    
    // Use Gemini API for translation
    const GEMINI_API_KEY = 'AIzaSyAEyTjstC9Wl2b5vqVTT_dL4Z7jSmbalY8';
    
    // Respond immediately to prevent connection issues
    sendResponse({status: "Translation request received"});
    
    // Check if API key has been set
    if (GEMINI_API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
      console.error('ERROR: You must set a real Gemini API key in content.js');
      showTranslationResult('ERROR: You need to set a real Gemini API key in content.js file before translations will work!', true);
      return;
    }
    
    // Show loading state (optional - we'll keep this for user feedback)
    showTranslationResult('Translating in new window... Please wait...', false, true);
    
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    const prompt = `Translate the following text to English, preserving the formatting and structure: "${selectedText}"`;
    
    fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })
    .then(response => {
      debugLog('API Response status:', response.status);
      return response.json();
    })
    .then(data => {
      debugLog('API Response data:', data);
      if (data.error) {
        logTestResult(selectedText, null, data.error);
        openTranslationInNewWindow(selectedText, 'Translation error: ' + data.error.message, true);
      } else {
        const translatedText = data.candidates[0].content.parts[0].text;
        logTestResult(selectedText, translatedText);
        openTranslationInNewWindow(selectedText, translatedText);
      }
    })
    .catch(error => {
      debugLog('API Error:', error);
      logTestResult(selectedText, null, error);
      openTranslationInNewWindow(selectedText, 'Translation error: ' + error.message, true);
    });
  }

  if (request.action === 'showTranslation') {
    let popup = document.getElementById('translate-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'translate-popup';
      popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 300px;
        padding: 15px;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 8px;
        z-index: 10000;
      `;
      document.body.appendChild(popup);
    }

    popup.innerHTML = `
      <div style="margin-bottom:10px"><strong>Original:</strong><br>${request.original}</div>
      <div><strong>Translation:</strong><br>${request.translation}</div>
      <button onclick="this.parentElement.remove()" style="margin-top:10px">Close</button>
    `;
  }

  if (request.action === 'showError') {
    alert(request.message);
  }
  
  if (request.action === 'runDiagnostics') {
    showDiagnosticPanel();
    sendResponse({status: "Diagnostics panel shown"});
  }
  
  // Always return true to indicate we'll respond asynchronously
  return true;
});

// Initialize the content script
function init() {
  debugLog('Initializing PDF Translator extension');
  
  // Check if we're on a PDF page
  if (isPdfPage()) {
    debugLog('PDF detected');
    // Show a hint about how to use the translator
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(66, 133, 244, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    hint.innerHTML = `
      <strong>PDF Translator Active</strong>
      <p>Select any text in this PDF and the translation will appear in a panel in the top-right corner.</p>
      <button id="close-hint-btn" style="background: white; color: #4285F4; border: none; padding: 5px 10px; margin-top: 5px; border-radius: 4px; cursor: pointer;">Got it</button>
    `;
    document.body.appendChild(hint);
    document.getElementById('close-hint-btn').addEventListener('click', () => hint.remove());
    setTimeout(() => hint.remove(), 10000);
  } else {
    // For non-PDF pages, we'll still enable translation but with a note
    debugLog('Not a PDF page, but translation is still available');
  }
  
  // Add keyboard shortcut for diagnostics (Ctrl+Shift+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      showDiagnosticPanel();
    }
  });
}

// Start the extension
document.addEventListener('DOMContentLoaded', init);

// Also run init immediately in case DOMContentLoaded already fired
init();