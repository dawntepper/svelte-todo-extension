console.log('Service worker starting...');

chrome.action.onClicked.addListener((tab) => {
  console.log('Action clicked, opening side panel...');
  chrome.sidePanel.open({ tabId: tab.id })
    .then(() => console.log('Side panel opened successfully'))
    .catch((error) => console.error('Error opening side panel:', error));
});

console.log('Setting panel behavior...');
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => console.log('Panel behavior set successfully'))
  .catch((error) => console.error('Error setting panel behavior:', error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === "sidePanelReady") {
    console.log("Side panel is ready");
    sendResponse({ status: "acknowledged" });
  }
  return true; // Indicates that the response is sent asynchronously
});

console.log('Service worker setup complete');