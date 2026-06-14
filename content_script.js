// content_script.js
// Finds media (videos and images) and injects download/open buttons.
// v2: compact buttons on small media, improved skip rules for UI thumbnails.

(function injectPageInterceptor() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page_interceptor.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
})();

const pageInterceptedVideoUrls = new Set();
window.addEventListener('toystaller_video_urls', (e) => {
    if (e.detail && Array.isArray(e.detail.urls)) {
        e.detail.urls.forEach(url => pageInterceptedVideoUrls.add(url));
    }
});

function triggerDownload(url) {
    chrome.runtime.sendMessage({ action: 'downloadMedia', url: url }, (response) => {
        if (!response || !response.success) {
            console.error("Download failed or was rejected.");
        }
    });
}

function scoreVideoUrl(url) {
    let score = 0;
    const lower = url.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.m4v')) score += 10;
    if (lower.includes('.m3u8') || lower.includes('.mpd')) score -= 5;
    if (lower.includes('bytestart') || lower.includes('byteend')) score -= 20;
    if (lower.includes('1080') || lower.includes('720')) score += 5;
    if (lower.includes('480') || lower.includes('360')) score += 2;
    score += Math.min(url.length / 100, 5);
    return score;
}

function pickBestVideoUrl(urls) {
    if (!urls || urls.length === 0) return null;
    const sorted = [...urls].sort((a, b) => scoreVideoUrl(b) - scoreVideoUrl(a));
    return sorted[0];
}

function isRawMediaTab() {
    if (document.contentType && (document.contentType.startsWith('video/') || document.contentType.startsWith('image/'))) {
        return true;
    }
    if (document.body && document.body.children.length === 1) {
        const child = document.body.firstElementChild;
        if (child && (child.tagName === 'VIDEO' || child.tagName === 'IMG')) {
            return true;
        }
    }
    return false;
}

function isLikelyUiThumbnail(media) {
    if (media.tagName.toLowerCase() !== 'img') return false;

    const rect = media.getBoundingClientRect();
    const naturalW = media.naturalWidth || media.width;
    const naturalH = media.naturalHeight || media.height;

    // If it's a large content image, do not treat as a thumbnail
    if (naturalW >= 200 && naturalH >= 200) {
        return false;
    }

    if (naturalW < 100 || naturalH < 100) return true;
    if (rect.width < 100 || rect.height < 100) return true;

    const role = (media.getAttribute('role') || '').toLowerCase();
    if (role === 'presentation' || role === 'none') return true;

    const parent = media.closest('button, a, [role="button"], nav, header');
    if (parent && (rect.width < 160 || rect.height < 160)) return true;

    return false;
}

function getButtonScale(media) {
    const rect = media.getBoundingClientRect();
    const minSide = Math.min(rect.width, rect.height);
    if (minSide < 180) return 0.85;
    if (minSide < 280) return 0.95;
    return 1;
}

function injectDownloadButtons() {
    if (isRawMediaTab()) return;

    const mediaElements = document.querySelectorAll('video, img');

    mediaElements.forEach(media => {
        if (isLikelyUiThumbnail(media)) return;

        if (window.magicOverlayManager && !window.magicOverlayManager.overlays.has(media)) {
            const isVideo = media.tagName.toLowerCase() === 'video';
            const magicId = Math.random().toString(36).substring(2, 15);
            if (isVideo) {
                media.dataset.magicId = magicId;
            }

            const scale = getButtonScale(media);

            const createButtonsFn = () => {
                const buttons = [];

                const makeBtnStyle = (bgColor) => `
                    padding: ${Math.round(7 * scale)}px;
                    background-color: ${bgColor};
                    color: white;
                    border: 1.5px solid rgba(255,255,255,0.85);
                    border-radius: 7px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: auto;
                    opacity: 0.55;
                    transition: opacity 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.45);
                    transform: scale(${scale});
                    transform-origin: center;
                `;

                const iconSize = Math.round(16 * scale);

                const openBtn = document.createElement('button');
                openBtn.className = 'magic-open-btn';
                openBtn.title = isVideo ? 'Open video in new tab' : 'Open image in new tab';
                openBtn.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
                openBtn.style.cssText = makeBtnStyle('rgba(30,30,30,0.75)');
                openBtn.addEventListener('mouseenter', () => {
                    openBtn.style.opacity = '1';
                    openBtn.style.backgroundColor = 'rgba(52, 152, 219, 0.95)';
                });
                openBtn.addEventListener('mouseleave', () => {
                    openBtn.style.opacity = '0.55';
                    openBtn.style.backgroundColor = 'rgba(30,30,30,0.75)';
                });
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    getMediaUrl((url) => {
                        chrome.runtime.sendMessage({ action: 'openInNewTab', url: url });
                    });
                });
                buttons.push(openBtn);

                if (!isVideo) {
                    const dlBtn = document.createElement('button');
                    dlBtn.className = 'magic-dl-btn';
                    dlBtn.title = 'Download image';
                    dlBtn.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
                    dlBtn.style.cssText = makeBtnStyle('rgba(30,30,30,0.75)');
                    dlBtn.addEventListener('mouseenter', () => {
                        dlBtn.style.opacity = '1';
                        dlBtn.style.backgroundColor = 'rgba(231, 76, 60, 0.95)';
                    });
                    dlBtn.addEventListener('mouseleave', () => {
                        dlBtn.style.opacity = '0.55';
                        dlBtn.style.backgroundColor = 'rgba(30,30,30,0.75)';
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

            const getMediaUrl = async (callback) => {
                if (isVideo) {
                    try {
                        const reactUrl = await new Promise((resolve) => {
                            const handler = (e) => {
                                window.removeEventListener('magic_response_react_url_' + magicId, handler);
                                resolve(e.detail.url);
                            };
                            window.addEventListener('magic_response_react_url_' + magicId, handler);
                            window.dispatchEvent(new CustomEvent('magic_get_react_url', { detail: { id: magicId } }));

                            setTimeout(() => {
                                window.removeEventListener('magic_response_react_url_' + magicId, handler);
                                resolve(null);
                            }, 300);
                        });

                        if (reactUrl) {
                            callback(reactUrl);
                            return;
                        }
                    } catch (e) {}
                }

                const getFilename = (urlStr) => {
                    try {
                        const parts = new URL(urlStr).pathname.split('/');
                        const name = parts.pop();
                        return (name && name.length > 5) ? name : null;
                    } catch (e) { return null; }
                };

                const currentFilename = getFilename(media.currentSrc || media.src);

                if (isVideo && pageInterceptedVideoUrls.size > 0 && currentFilename) {
                    const matches = Array.from(pageInterceptedVideoUrls).filter(u => {
                        const interceptedName = getFilename(u);
                        return interceptedName && interceptedName === currentFilename && !u.includes('bytestart');
                    });

                    if (matches.length > 0) {
                        const best = pickBestVideoUrl(matches);
                        if (best) {
                            callback(best);
                            return;
                        }
                    }
                }

                if (isVideo && media.currentSrc &&
                    !media.currentSrc.startsWith('blob:') &&
                    !media.currentSrc.startsWith('data:')) {
                    callback(media.currentSrc);
                    return;
                }

                if (media.src && !media.src.startsWith('blob:') && !media.src.startsWith('data:')) {
                    callback(media.src);
                    return;
                }

                if (isVideo) {
                    const sourceTag = media.querySelector('source');
                    if (sourceTag && sourceTag.src &&
                        !sourceTag.src.startsWith('blob:') &&
                        !sourceTag.src.startsWith('data:')) {
                        callback(sourceTag.src);
                        return;
                    }
                }

                const mediaType = isVideo ? 'video' : 'img';
                chrome.runtime.sendMessage({ action: 'getMediaUrls', mediaType: mediaType }, (response) => {
                    if (response && response.urls && response.urls.length > 0) {
                        const best = pickBestVideoUrl(response.urls);
                        if (best) {
                            callback(best);
                            return;
                        }
                    }
                    alert('Could not find the video URL yet.\n\nTip: Make sure the video has started playing, then click the button again.');
                });
            };

            if (window.magicOverlayManager) {
                window.magicOverlayManager.addOverlay(media, createButtonsFn);
            }
        }
    });
}

let injectTimer = null;
function scheduleInject() {
    if (injectTimer) return;
    injectTimer = setTimeout(() => {
        injectTimer = null;
        injectDownloadButtons();
    }, 200);
}

injectDownloadButtons();
setInterval(injectDownloadButtons, 1500);

const mediaObserver = new MutationObserver(scheduleInject);
if (document.documentElement) {
    mediaObserver.observe(document.documentElement, { childList: true, subtree: true });
}
