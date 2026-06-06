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

// ─── URL cleaner ─────────────────────────────────────────────────────────────
// Strips byte-range segment params so we get the full file, not a DASH chunk.
// Also strips other range-limiting params Instagram/Facebook CDN appends.
function cleanVideoUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        // Remove byte-range params that turn the URL into a tiny DASH segment
        u.searchParams.delete('bytestart');
        u.searchParams.delete('byteend');
        return u.toString();
    } catch (e) {
        return rawUrl;
    }
}

// ─── URL scorer ──────────────────────────────────────────────────────────────
// Returns a higher score for better (full-file, higher-res) video URLs.
function scoreVideoUrl(url) {
    let score = 0;
    const lower = url.toLowerCase();
    // Strongly penalise byte-range segment URLs
    if (lower.includes('bytestart') || lower.includes('byteend')) score -= 100;
    // Prefer actual mp4 files over m3u8 manifests or dash
    if (lower.includes('.mp4') || lower.includes('.m4v')) score += 10;
    if (lower.includes('.m3u8')) score -= 5;
    // Prefer higher-res indicators
    if (lower.includes('1080') || lower.includes('720')) score += 5;
    if (lower.includes('480') || lower.includes('360')) score += 2;
    // Longer URL usually means more metadata/tokens → more likely a full CDN URL
    score += Math.min(url.length / 100, 5);
    return score;
}

// Pick the best URL from a list
function pickBestVideoUrl(urls) {
    if (!urls || urls.length === 0) return null;
    const sorted = [...urls].sort((a, b) => scoreVideoUrl(b) - scoreVideoUrl(a));
    return cleanVideoUrl(sorted[0]);
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

            // ── Container ──────────────────────────────────────────────────────
            // pointer-events: none  →  the container itself never intercepts
            //                          mouse events. Video play/pause works normally.
            // Buttons inside have pointer-events: auto individually.
            const container = document.createElement('div');
            container.className = 'magic-dl-container';
            container.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 2147483647;
                display: flex;
                gap: 6px;
                pointer-events: none;
            `;

            // ── Button base style ──────────────────────────────────────────────
            // Each button has its own opacity transition + pointer-events: auto.
            // Opacity starts at 0.45 (visible but unobtrusive) and jumps to 1
            // on hover so users know they can click it.
            const makeBtnStyle = (bgColor) => `
                padding: 7px;
                background-color: ${bgColor};
                color: white;
                border: 1.5px solid rgba(255,255,255,0.85);
                border-radius: 7px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto;
                opacity: 0.5;
                transition: opacity 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
                box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            `;

            // ── Open in New Tab button (always present) ────────────────────────
            const openBtn = document.createElement('button');
            openBtn.className = 'magic-open-btn';
            openBtn.title = 'Open video in new tab';
            openBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
            openBtn.style.cssText = makeBtnStyle('rgba(30,30,30,0.75)');
            openBtn.addEventListener('mouseenter', () => {
                openBtn.style.opacity = '1';
                openBtn.style.backgroundColor = 'rgba(52, 152, 219, 0.95)';
                openBtn.style.transform = 'scale(1.08)';
            });
            openBtn.addEventListener('mouseleave', () => {
                openBtn.style.opacity = '0.5';
                openBtn.style.backgroundColor = 'rgba(30,30,30,0.75)';
                openBtn.style.transform = 'scale(1)';
            });

            // ── Download button (images only) ──────────────────────────────────
            let dlBtn = null;
            if (!isVideo) {
                dlBtn = document.createElement('button');
                dlBtn.className = 'magic-dl-btn';
                dlBtn.title = 'Download image';
                dlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
                dlBtn.style.cssText = makeBtnStyle('rgba(30,30,30,0.75)');
                dlBtn.addEventListener('mouseenter', () => {
                    dlBtn.style.opacity = '1';
                    dlBtn.style.backgroundColor = 'rgba(231, 76, 60, 0.95)';
                    dlBtn.style.transform = 'scale(1.08)';
                });
                dlBtn.addEventListener('mouseleave', () => {
                    dlBtn.style.opacity = '0.5';
                    dlBtn.style.backgroundColor = 'rgba(30,30,30,0.75)';
                    dlBtn.style.transform = 'scale(1)';
                });
            }

            // Make parent relatively positioned so our absolute overlay works
            if (window.getComputedStyle(media.parentElement).position === 'static') {
                media.parentElement.style.position = 'relative';
            }

            // ─── getMediaUrl: multi-strategy URL resolution ──────────────────
            const getMediaUrl = (callback) => {

                // STRATEGY A: video.currentSrc — the real CDN URL the browser chose to play.
                // Populated once the video starts loading/playing. Most reliable direct method.
                if (isVideo && media.currentSrc &&
                    !media.currentSrc.startsWith('blob:') &&
                    !media.currentSrc.startsWith('data:')) {
                    const cleaned = cleanVideoUrl(media.currentSrc);
                    console.log('[Toystaller] Strategy A (currentSrc):', cleaned);
                    callback(cleaned);
                    return;
                }

                // STRATEGY B: video.src or img.src (standard direct link)
                if (media.src && !media.src.startsWith('blob:') && !media.src.startsWith('data:')) {
                    const cleaned = cleanVideoUrl(media.src);
                    console.log('[Toystaller] Strategy B (src):', cleaned);
                    callback(cleaned);
                    return;
                }

                // STRATEGY C: <source> child tags
                if (isVideo) {
                    const sourceTag = media.querySelector('source');
                    if (sourceTag && sourceTag.src &&
                        !sourceTag.src.startsWith('blob:') &&
                        !sourceTag.src.startsWith('data:')) {
                        const cleaned = cleanVideoUrl(sourceTag.src);
                        console.log('[Toystaller] Strategy C (source tag):', cleaned);
                        callback(cleaned);
                        return;
                    }
                }

                // STRATEGY D: URLs intercepted by the page_interceptor (fetch/XHR monkey-patch)
                if (isVideo && pageInterceptedVideoUrls.size > 0) {
                    const best = pickBestVideoUrl(Array.from(pageInterceptedVideoUrls));
                    if (best) {
                        console.log('[Toystaller] Strategy D (page interceptor):', best);
                        callback(best);
                        return;
                    }
                }

                // STRATEGY E: Background script network interception (CDN URLs via webRequest)
                const mediaType = isVideo ? 'video' : 'img';
                chrome.runtime.sendMessage({ action: 'getMediaUrls', mediaType: mediaType }, (response) => {
                    if (response && response.urls && response.urls.length > 0) {
                        const best = pickBestVideoUrl(response.urls);
                        if (best) {
                            console.log('[Toystaller] Strategy E (background webRequest):', best);
                            callback(best);
                            return;
                        }
                    }
                    alert('Could not find the video URL yet.\n\nTip: Make sure the video has started playing, then click the button again.');
                });
            };

            // ── Click handlers ─────────────────────────────────────────────────
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

            // Assemble and inject
            container.appendChild(openBtn);
            if (dlBtn) container.appendChild(dlBtn);
            media.parentElement.appendChild(container);
        }
    });
}

// Run on an interval to catch dynamically loaded media (infinite scroll, reels, etc.)
setInterval(injectDownloadButtons, 1500);