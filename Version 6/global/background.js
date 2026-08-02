// extensions/global/background.js
// Toystaller Global — background script with all platform-specific handlers.

importScripts('core/background_core.js');

// Facebook-specific: Fetch mobile version of a Facebook page to extract progressive MP4 URLs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchMobileFacebookVideo') {
        const urlObj = new URL(request.url);
        urlObj.hostname = 'm.facebook.com';

        fetch(urlObj.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            }
        })
        .then(r => r.text())
        .then(html => {
            let videoUrl = null;

            const srcMatch = html.match(/src="([^"]+?\.mp4[^"]*?)"/);
            if (srcMatch && srcMatch[1]) {
                videoUrl = srcMatch[1].replace(/&amp;/g, '&').replace(/\\\//g, '/');
            }

            if (!videoUrl) {
                const playableMatch = html.match(/"playable_url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                if (playableMatch && playableMatch[1]) {
                    try { videoUrl = JSON.parse('"' + playableMatch[1] + '"'); } catch (e) {}
                }
            }

            if (!videoUrl) {
                const hdMatch = html.match(/"playable_url_quality_hd"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                if (hdMatch && hdMatch[1]) {
                    try { videoUrl = JSON.parse('"' + hdMatch[1] + '"'); } catch (e) {}
                }
            }

            if (!videoUrl) {
                const browserMatch = html.match(/"browser_native_(?:hd|sd)_url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                if (browserMatch && browserMatch[1]) {
                    try { videoUrl = JSON.parse('"' + browserMatch[1] + '"'); } catch (e) {}
                }
            }

            sendResponse({ url: videoUrl });
        })
        .catch(err => {
            console.error("Facebook mobile fetch error:", err);
            sendResponse({ url: null });
        });
        return true;
    }
});
