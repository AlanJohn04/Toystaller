// background_script.js
// Listens for media network requests and handles downloads / new-tab opens.

const interceptedMedia = {};

const mediaExtensions = ['.mp4', '.m3u8', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.m4a'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

chrome.webRequest.onResponseStarted.addListener(
    (details) => {
        const { tabId, url, type } = details;
        if (tabId < 0) return;

        const lowerUrl = url.toLowerCase();
        const isVideo = type === 'media' ||
                        mediaExtensions.some(ext => lowerUrl.includes(ext)) ||
                        lowerUrl.includes('mime=video') ||
                        lowerUrl.includes('/video/');
        const isImage = type === 'image' || imageExtensions.some(ext => lowerUrl.includes(ext));

        if (isVideo || isImage) {
            if (!interceptedMedia[tabId]) {
                interceptedMedia[tabId] = { video: new Set(), img: new Set() };
            }
            if (isVideo) {
                interceptedMedia[tabId].video.add(url);
            } else if (isImage) {
                interceptedMedia[tabId].img.add(url);
            }
        }
    },
    { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getMediaUrls') {
        const tabId = sender.tab ? sender.tab.id : request.tabId;
        const mediaType = request.mediaType;
        const tabMedia = interceptedMedia[tabId];
        const urls = tabMedia && tabMedia[mediaType] ? Array.from(tabMedia[mediaType]) : [];
        sendResponse({ urls: urls });
    } else if (request.action === 'downloadMedia') {
        let targetUrl = request.url;
        let filenameHint = undefined;
        if (targetUrl && targetUrl.includes('#_q=')) {
            const parts = targetUrl.split('#_q=');
            targetUrl = parts[0];
            filenameHint = parts[1];
        } else if (targetUrl && targetUrl.includes('#')) {
            targetUrl = targetUrl.split('#')[0];
        }

        const downloadOptions = { url: targetUrl, saveAs: true };
        if (filenameHint) {
            downloadOptions.filename = filenameHint;
        }

        chrome.downloads.download(downloadOptions, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed:", chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true;
    } else if (request.action === 'openInNewTab') {
        let cleanUrl = request.url ? request.url.split('#')[0] : '';
        if (cleanUrl) {
            chrome.tabs.create({ url: cleanUrl });
        }
        sendResponse({ success: true });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete interceptedMedia[tabId];
});

chrome.action.onClicked.addListener((tab) => {
    if (tab.id > 0) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleDashboard' }).catch(err => {
            console.log("Error sending toggleDashboard to tab:", err);
        });
    }
});
