// content_script.js
// This script runs directly on the webpage (Facebook, Instagram, etc.)
// It finds media (videos and images) and injects the download/open buttons.

// ─── Strategy 1: Inject the page-world interceptor script ───────────────────
// This runs in the real page context and monkey-patches fetch/XHR to capture
// actual CDN video URLs from Instagram's JSON API responses.
(function injectPageInterceptor() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page_interceptor.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
})();

// ─── Strategy 2: Listen for video URLs dispatched by the page interceptor ───
// The page_interceptor dispatches a CustomEvent with the real CDN URLs.
// We store them per-tab in a local Set so getMediaUrl can use them.
const pageInterceptedVideoUrls = new Set();
window.addEventListener('toystaller_video_urls', (e) => {
    if (e.detail && Array.isArray(e.detail.urls)) {
        e.detail.urls.forEach(url => pageInterceptedVideoUrls.add(url));
    }
});

// ─── Download helper (for images) ───────────────────────────────────────────
function triggerDownload(url) {
    chrome.runtime.sendMessage({ action: 'downloadMedia', url: url }, (response) => {
        if (!response || !response.success) {
            console.error("Download failed or was rejected.");
        }
    });
}

// ─── Main injection function ─────────────────────────────────────────────────
function injectDownloadButtons() {
    const mediaElements = document.querySelectorAll('video, img');

    mediaElements.forEach(media => {
        // Skip small images (icons, avatars, etc.)
        if (media.tagName.toLowerCase() === 'img') {
            if (media.width < 100 || media.height < 100) return;
        }

        // Skip if we already added buttons to this element's parent
        if (media.parentElement && !media.parentElement.querySelector('.magic-dl-container')) {

            const isVideo = media.tagName.toLowerCase() === 'video';

            // Create container
            const container = document.createElement('div');
            container.className = 'magic-dl-container';
            container.style.cssText = `
                position: absolute;
                top: 15px;
                right: 15px;
                z-index: 2147483647;
                display: flex;
                gap: 6px;
                opacity: 0.5;
                transition: opacity 0.2s ease-in-out;
            `;

            const btnStyles = `
                padding: 6px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                border: 1.5px solid white;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            `;

            // Open in New Tab button (always present)
            const openBtn = document.createElement('button');
            openBtn.className = 'magic-open-btn';
            openBtn.title = 'Open in New Tab';
            openBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
            openBtn.style.cssText = btnStyles;
            openBtn.onmouseover = () => openBtn.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
            openBtn.onmouseout = () => openBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';

            // Download button (only for images)
            let dlBtn = null;
            if (!isVideo) {
                dlBtn = document.createElement('button');
                dlBtn.className = 'magic-dl-btn';
                dlBtn.title = 'Download';
                dlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
                dlBtn.style.cssText = btnStyles;
                dlBtn.onmouseover = () => dlBtn.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
                dlBtn.onmouseout = () => dlBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }

            // Make parent relatively positioned so our absolute overlay works
            if (window.getComputedStyle(media.parentElement).position === 'static') {
                media.parentElement.style.position = 'relative';
            }

            // Hover: fade fully in when user hovers the container itself
            container.addEventListener('mouseenter', () => { container.style.opacity = '1'; });
            container.addEventListener('mouseleave', () => { container.style.opacity = '0.5'; });

            // ─── getMediaUrl: multi-strategy URL resolution ──────────────────
            const getMediaUrl = (callback) => {
                // STRATEGY A: video.currentSrc — the real CDN URL the browser chose to play.
                // This is populated once the video starts loading/playing, and is the most
                // direct, reliable approach for HTML5 video players.
                if (isVideo && media.currentSrc && !media.currentSrc.startsWith('blob:') && !media.currentSrc.startsWith('data:')) {
                    console.log('[Toystaller] Strategy A (currentSrc):', media.currentSrc);
                    callback(media.currentSrc);
                    return;
                }

                // STRATEGY B: video.src or img.src (standard direct link)
                if (media.src && !media.src.startsWith('blob:') && !media.src.startsWith('data:')) {
                    console.log('[Toystaller] Strategy B (src):', media.src);
                    callback(media.src);
                    return;
                }

                // STRATEGY C: <source> child tags (for videos with multiple source elements)
                if (isVideo) {
                    const sourceTag = media.querySelector('source');
                    if (sourceTag && sourceTag.src && !sourceTag.src.startsWith('blob:') && !sourceTag.src.startsWith('data:')) {
                        console.log('[Toystaller] Strategy C (source tag):', sourceTag.src);
                        callback(sourceTag.src);
                        return;
                    }
                }

                // STRATEGY D: URLs intercepted by the page_interceptor (fetch/XHR monkey-patch)
                if (isVideo && pageInterceptedVideoUrls.size > 0) {
                    // Prefer the largest/most-recent URL (Instagram typically returns higher-res last)
                    const urls = Array.from(pageInterceptedVideoUrls);
                    // Filter for obvious video CDN URLs; prefer mp4 over m3u8 chunks
                    const mp4Urls = urls.filter(u => u.includes('.mp4') || u.includes('.m4v'));
                    const chosen = mp4Urls.length > 0 ? mp4Urls[mp4Urls.length - 1] : urls[urls.length - 1];
                    console.log('[Toystaller] Strategy D (page interceptor):', chosen);
                    callback(chosen);
                    return;
                }

                // STRATEGY E: Background script network interception (CDN URLs via webRequest)
                const mediaType = isVideo ? 'video' : 'img';
                chrome.runtime.sendMessage({ action: 'getMediaUrls', mediaType: mediaType }, (response) => {
                    if (response && response.urls && response.urls.length > 0) {
                        const urls = response.urls;
                        const mp4Urls = urls.filter(u => u.includes('.mp4') || u.includes('.m4v'));
                        const chosen = mp4Urls.length > 0 ? mp4Urls[mp4Urls.length - 1] : urls[urls.length - 1];
                        console.log('[Toystaller] Strategy E (background webRequest):', chosen);
                        callback(chosen);
                    } else {
                        alert('Could not find the video URL yet.\n\nTip: Make sure the video has started playing, then click again.');
                    }
                });
            };

            // Click handlers
            if (dlBtn) {
                dlBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    getMediaUrl((url) => triggerDownload(url));
                });
            }

            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                getMediaUrl((url) => {
                    chrome.runtime.sendMessage({ action: 'openInNewTab', url: url });
                });
            });

            // Assemble: open button first (only button for videos), then download (only for images)
            container.appendChild(openBtn);
            if (dlBtn) container.appendChild(dlBtn);
            media.parentElement.appendChild(container);
        }
    });
}

// Run on a short interval to catch dynamically loaded media (infinite scroll, reels, etc.)
setInterval(injectDownloadButtons, 1500);