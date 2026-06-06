// page_interceptor.js
// This script runs in the PAGE's actual JavaScript context (MAIN world).
// It monkey-patches fetch and XHR to intercept Instagram API responses
// and extract real video CDN URLs from the JSON body.

(function () {
    'use strict';

    // Helper: recursively search an object for any value that looks like a video CDN URL
    function findVideoUrls(obj, found = new Set(), depth = 0) {
        if (depth > 10 || !obj || typeof obj !== 'object') return found;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string') {
                // Look for typical Instagram/Facebook video CDN URLs
                if (
                    (val.includes('video') || val.includes('.mp4') || val.includes('.m4v')) &&
                    (val.startsWith('https://') || val.startsWith('http://')) &&
                    !val.includes('blob:')
                ) {
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

})();
