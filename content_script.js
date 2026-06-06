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

// ─── No URL cleaner ─────────────────────────────────────────────────────────────
// We can't safely strip bytestart/byteend params because it invalidates the CDN
// URL signature (returning 400 or 403 errors). We must use the URL exactly as found.

// ─── URL scorer ──────────────────────────────────────────────────────────────
// Returns a higher score for better (full-file, higher-res) video URLs.
function scoreVideoUrl(url) {
    let score = 0;
    const lower = url.toLowerCase();
    // Prefer actual mp4 files over m3u8 manifests or dash
    if (lower.includes('.mp4') || lower.includes('.m4v')) score += 10;
    // Penalize manifest files
    if (lower.includes('.m3u8') || lower.includes('.mpd')) score -= 5;
    // Heavily penalize byte-range segments, as they are not the full video
    if (lower.includes('bytestart') || lower.includes('byteend')) score -= 20;
    // Prefer higher-res indicators
    if (lower.includes('1080') || lower.includes('720')) score += 5;
    if (lower.includes('480') || lower.includes('360')) score += 2;
    // Longer URL usually means more metadata/tokens → more likely a full CDN URL
    score += Math.min(url.length / 100, 5);
    return score;
}

function pickBestVideoUrl(urls) {
    if (!urls || urls.length === 0) return null;
    const sorted = [...urls].sort((a, b) => scoreVideoUrl(b) - scoreVideoUrl(a));
    return sorted[0]; // Return the raw URL (do not clean, to preserve signatures)
}

// ─── Main injection function ─────────────────────────────────────────────────
function injectDownloadButtons() {
    const mediaElements = document.querySelectorAll('video, img');

    mediaElements.forEach(media => {
        // Skip small images (icons, avatars, etc.)
        if (media.tagName.toLowerCase() === 'img') {
            if (media.width < 100 || media.height < 100) return;
        }

        // Use overlay manager to check if we already added buttons
        if (window.magicOverlayManager && !window.magicOverlayManager.overlays.has(media)) {

            const isVideo = media.tagName.toLowerCase() === 'video';
            const magicId = Math.random().toString(36).substring(2, 15);
            if (isVideo) {
                media.dataset.magicId = magicId;
            }

            const createButtonsFn = () => {
                const buttons = [];

                // ── Button base style ──────────────────────────────────────────────
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
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    getMediaUrl((url) => {
                        chrome.runtime.sendMessage({ action: 'openInNewTab', url: url });
                    });
                });
                buttons.push(openBtn);

                // ── Download button (images only) ──────────────────────────────────
                if (!isVideo) {
                    const dlBtn = document.createElement('button');
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
                    dlBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        getMediaUrl((url) => triggerDownload(url));
                    });
                    buttons.push(dlBtn);
                }

                return buttons;
            };

            // ─── getMediaUrl: multi-strategy URL resolution ──────────────────
            const getMediaUrl = async (callback) => {
                
                // STRATEGY 1: React Fiber Extractor (100% accurate for current video)
                if (isVideo) {
                    try {
                        const reactUrl = await new Promise((resolve) => {
                            const handler = (e) => {
                                window.removeEventListener('magic_response_react_url_' + magicId, handler);
                                resolve(e.detail.url);
                            };
                            window.addEventListener('magic_response_react_url_' + magicId, handler);
                            window.dispatchEvent(new CustomEvent('magic_get_react_url', { detail: { id: magicId } }));
                            
                            // Timeout after 300ms
                            setTimeout(() => {
                                window.removeEventListener('magic_response_react_url_' + magicId, handler);
                                resolve(null);
                            }, 300);
                        });

                        if (reactUrl) {
                            console.log('[Toystaller] Strategy 1 (React Extractor):', reactUrl);
                            callback(reactUrl);
                            return;
                        }
                    } catch (e) {}
                }

                // Helper to get filename from URL
                const getFilename = (urlStr) => {
                    try {
                        const parts = new URL(urlStr).pathname.split('/');
                        const name = parts.pop();
                        return (name && name.length > 5) ? name : null;
                    } catch (e) { return null; }
                };

                const currentFilename = getFilename(media.currentSrc || media.src);

                // STRATEGY 2: Global intercepted URLs (Filtered by filename)
                if (isVideo && pageInterceptedVideoUrls.size > 0 && currentFilename) {
                    // Only consider intercepted URLs that share the same filename as the DASH chunk
                    const matches = Array.from(pageInterceptedVideoUrls).filter(u => {
                        const interceptedName = getFilename(u);
                        return interceptedName && interceptedName === currentFilename && !u.includes('bytestart');
                    });
                    
                    if (matches.length > 0) {
                        const best = pickBestVideoUrl(matches);
                        if (best) {
                            console.log('[Toystaller] Strategy 2 (Global Pool Match):', best);
                            callback(best);
                            return;
                        }
                    }
                }

                // STRATEGY 3: video.currentSrc — the raw URL the browser chose.
                if (isVideo && media.currentSrc &&
                    !media.currentSrc.startsWith('blob:') &&
                    !media.currentSrc.startsWith('data:')) {
                    console.log('[Toystaller] Strategy 3 (currentSrc):', media.currentSrc);
                    callback(media.currentSrc);
                    return;
                }

                // STRATEGY 4: video.src or img.src (standard direct link)
                if (media.src && !media.src.startsWith('blob:') && !media.src.startsWith('data:')) {
                    console.log('[Toystaller] Strategy 4 (src):', media.src);
                    callback(media.src);
                    return;
                }

                // STRATEGY 5: <source> child tags
                if (isVideo) {
                    const sourceTag = media.querySelector('source');
                    if (sourceTag && sourceTag.src &&
                        !sourceTag.src.startsWith('blob:') &&
                        !sourceTag.src.startsWith('data:')) {
                        console.log('[Toystaller] Strategy 5 (source tag):', sourceTag.src);
                        callback(sourceTag.src);
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

            // Assemble and inject using our overlay manager
            if (window.magicOverlayManager) {
                window.magicOverlayManager.addOverlay(media, createButtonsFn);
            }
        }
    });
}

// Run on an interval to catch dynamically loaded media (infinite scroll, reels, etc.)
setInterval(injectDownloadButtons, 1500);