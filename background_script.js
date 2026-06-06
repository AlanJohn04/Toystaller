// This script runs in the background and does the job of the "Network" tab.
// It silently listens for media requests (.mp4, .m3u8, etc.) and stores them.

const mediaUrls = {};

const mediaExtensions = ['.mp4', '.m3u8', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

// Intercept network requests
chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        const { tabId, url, type } = details;
        if (tabId < 0) return;

        const lowerUrl = url.toLowerCase();
        const isMediaFormat = mediaExtensions.some(ext => lowerUrl.includes(ext));
        const isImageFormat = imageExtensions.some(ext => lowerUrl.includes(ext));

        // Check if the request is a media file or a common video format
        if (type === 'media' || type === 'image' || isMediaFormat || isImageFormat) {
            if (!mediaUrls[tabId]) {
                mediaUrls[tabId] = new Set();
            }
            // Store the detected video URL for this specific tab
            mediaUrls[tabId].add(url);
            console.log("Intercepted media URL:", url);
        }
    },
    { urls: ["<all_urls>"] }
);

// Listen for messages from the content script (the download button)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getMediaUrls') {
        const tabId = sender.tab ? sender.tab.id : request.tabId;
        const urls = mediaUrls[tabId] ? Array.from(mediaUrls[tabId]) : [];
        sendResponse({ urls: urls });
    } else if (request.action === 'downloadMedia') {
        chrome.downloads.download({
            url: request.url,
            saveAs: true // Let the user choose where to save and file name
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed:", chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true; // Keep message channel open for async response
    }
});

// Clean up memory when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete mediaUrls[tabId];
});