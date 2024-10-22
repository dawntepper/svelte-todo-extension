/// <reference types="chrome" />
import App from './App.svelte';

const target = document.body;

const app = new App({
  target: target,
});

// This ensures that the Chrome API is available before we use it
if (typeof chrome !== 'undefined' && chrome.action) {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidebar.html' })
        .catch((error: Error) => {
          console.error('Failed to set side panel options:', error);
        });
    }
  });
}

export default app;