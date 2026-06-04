chrome.runtime.onInstalled.addListener(() => {
  console.log('Medium Summarizer AI installed');
});

// Only respond to messages from this extension's own pages
chrome.runtime.onMessage.addListener((_message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  sendResponse({ alive: true });
  return true;
});
