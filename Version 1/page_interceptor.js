// page_interceptor.js
// This script runs in the PAGE's actual JavaScript context (MAIN world).
// It monkey-patches fetch and XHR to intercept Instagram API responses
// and extract real video CDN URLs from the JSON body.

(function () {
    'use strict';

    // High-priority JSON keys Instagram uses for video URLs
    const VIDEO_KEYS = new Set(['video_url', 'playback_url', 'src', 'url', 'dash_manifest']);

    // Helper: recursively search an object for any value that looks like a video CDN URL
    function findVideoUrls(obj, found = new Set(), depth = 0) {
        if (depth > 12 || !obj || typeof obj !== 'object') return found;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string') {
                const isHttp = val.startsWith('https://') || val.startsWith('http://');
                if (!isHttp || val.includes('blob:')) continue;

                const lower = val.toLowerCase();
                // Accept if: it's a known video key, or the URL path/domain suggests video
                const looksLikeVideo =
                    VIDEO_KEYS.has(key) ||
                    lower.includes('.mp4') ||
                    lower.includes('.m4v') ||
                    lower.includes('.webm') ||
                    (lower.includes('fbcdn.net') && lower.includes('video')) ||
                    (lower.includes('cdninstagram.com') && lower.includes('video'));

                if (looksLikeVideo) {
                    found.add(val);
                }
            } else if (typeof val === 'object') {
                findVideoUrls(val, found, depth + 1);
            }
        }
        return found;
    }

    function dispatchVideoUrls(urls) {
        if (!urls || urls.size === 0) return;
        window.dispatchEvent(new CustomEvent('toystaller_video_urls', {
            detail: { urls: Array.from(urls) }
        }));
    }

    // Patch fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
            // Only care about Instagram API / graphql / media calls
            if (
                url.includes('instagram.com') ||
                url.includes('facebook.com') ||
                url.includes('graph.') ||
                url.includes('/api/v')
            ) {
                const clone = response.clone();
                clone.json().then(data => {
                    const found = findVideoUrls(data);
                    dispatchVideoUrls(found);
                }).catch(() => {});
            }
        } catch (e) {}
        return response;
    };

    // Patch XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open.bind(xhr);
        let reqUrl = '';
        xhr.open = function (method, url, ...rest) {
            reqUrl = url || '';
            return originalOpen(method, url, ...rest);
        };
        xhr.addEventListener('load', function () {
            try {
                if (
                    reqUrl.includes('instagram.com') ||
                    reqUrl.includes('facebook.com') ||
                    reqUrl.includes('/api/v')
                ) {
                    const data = JSON.parse(this.responseText);
                    const found = findVideoUrls(data);
                    dispatchVideoUrls(found);
                }
            } catch (e) {}
        });
        return xhr;
    }
    PatchedXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    // ─── React Fiber Extractor ───────────────────────────────────────────────────
    // Allows the extension's isolated world to request the video URL from the
    // React state of a specific DOM element. This ensures we get the EXACT url
    // for the hovered video, rather than a random one from the global pool.
    
    function searchObjForVideoUrl(obj, seen = new Set(), depth = 0) {
        if (depth > 6 || !obj || typeof obj !== 'object') return null;
        if (seen.has(obj)) return null;
        seen.add(obj);

        if (Array.isArray(obj)) {
            for (let item of obj) {
                const res = searchObjForVideoUrl(item, seen, depth + 1);
                if (res) return res;
            }
        } else {
            for (let key of Object.keys(obj)) {
                // Skip circular React properties that go back up the tree
                if (key === 'return' || key === 'sibling' || key === '_owner' || key === 'parent') continue;
                
                const val = obj[key];
                if (typeof val === 'string') {
                    // Look for valid MP4 URLs (skip DASH segments if possible)
                    if (
                        (val.includes('.mp4') || key === 'video_url' || key === 'playback_url') &&
                        val.startsWith('http') &&
                        !val.includes('bytestart')
                    ) {
                        return val;
                    }
                } else if (typeof val === 'object') {
                    const res = searchObjForVideoUrl(val, seen, depth + 1);
                    if (res) return res;
                }
            }
        }
        return null;
    }

    function extractVideoUrlFromReact(el) {
        let current = el;
        // Search up to 10 levels of parent elements for React props
        for (let i = 0; i < 10 && current; i++) {
            const key = Object.keys(current).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (key && current[key]) {
                const found = searchObjForVideoUrl(current[key]);
                if (found) return found;
            }
            current = current.parentElement;
        }
        return null;
    }

    window.addEventListener('magic_get_react_url', (e) => {
        if (!e.detail || !e.detail.id) return;
        const id = e.detail.id;
        const el = document.querySelector(`[data-magic-id="${id}"]`);
        
        let url = null;
        if (el) {
            url = extractVideoUrlFromReact(el);
        }
        
        window.dispatchEvent(new CustomEvent('magic_response_react_url_' + id, {
            detail: { url: url }
        }));
    });

})();
