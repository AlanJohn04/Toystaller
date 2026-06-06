// This script runs in the background and does the job of the "Network" tab.
// It silently listens for media requests (.mp4, .m3u8, etc.) and stores them.

const interceptedMedia = {};

const mediaExtensions = ['.mp4', '.m3u8', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

// Intercept network requests
chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        const { tabId, url, type } = details;
        if (tabId < 0) return;

        const lowerUrl = url.toLowerCase();
        const isVideo = type === 'media' || mediaExtensions.some(ext => lowerUrl.includes(ext));
        const isImage = type === 'image' || imageExtensions.some(ext => lowerUrl.includes(ext));

        if (isVideo || isImage) {
            if (!interceptedMedia[tabId]) {
                interceptedMedia[tabId] = { video: new Set(), img: new Set() };
            }
            if (isVideo) {
                interceptedMedia[tabId].video.add(url);
                console.log("Intercepted video URL:", url);
            } else if (isImage) {
                interceptedMedia[tabId].img.add(url);
            }
        }
    },
    { urls: ["<all_urls>"] }
);

// Listen for messages from the content script (the download button)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getMediaUrls') {
        const tabId = sender.tab ? sender.tab.id : request.tabId;
        const mediaType = request.mediaType; // 'video' or 'img'
        const tabMedia = interceptedMedia[tabId];
        const urls = tabMedia && tabMedia[mediaType] ? Array.from(tabMedia[mediaType]) : [];
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
    delete interceptedMedia[tabId];
});