chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
    .catch((error) => console.error('Error opening side panel:', error));
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sidePanelReady") {
    console.log("Side panel is ready");
    sendResponse({ status: "acknowledged" });
    return true; // Indicates that the response is sent asynchronously
  }
});