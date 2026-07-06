// page_interceptor.js
// Runs in the page context. Intercepts fetch/XHR for CDN video URLs
// and exposes a React Fiber extractor for accurate per-video URL lookup.

(function () {
    'use strict';
    // Guard: prevent double-execution if loaded via both manifest and dynamic injection
    if (window.__toystallerInterceptorLoaded) return;
    window.__toystallerInterceptorLoaded = true;

    const VIDEO_KEYS = new Set([
        'video_url', 'playback_url', 'src', 'url', 'dash_manifest',
        'progressiveUrl', 'downloadUrl', 'streamingUrl', 'videoUrl',
        'progressiveStreams', 'transcodedVideoUrl',
        // Facebook GraphQL keys
        'playable_url', 'playable_url_quality_hd',
        // LinkedIn Voyager API keys
        'adaptiveStreams', 'progressiveStreams', 'mediaUrl',
        'media', 'rootUrl', 'liveVideoUrl', 'thumbnail'
    ]);

    function findVideoUrls(obj, found = new Set(), depth = 0) {
        if (depth > 12 || !obj || typeof obj !== 'object') return found;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string') {
                const isHttp = val.startsWith('https://') || val.startsWith('http://');
                if (!isHttp || val.includes('blob:')) continue;

                const lower = val.toLowerCase();
                const isInternalPage = lower.includes('//www.facebook.com') ||
                                       lower.includes('//facebook.com') ||
                                       lower.includes('//www.instagram.com') ||
                                       lower.includes('//instagram.com');
                if (isInternalPage) continue;

                const lowerKey = key.toLowerCase();
                const isVideoKey = VIDEO_KEYS.has(key) ||
                                   lowerKey.includes('video') ||
                                   lowerKey.includes('stream') ||
                                   lowerKey.includes('playback');

                const looksLikeVideo =
                    isVideoKey ||
                    lower.includes('.mp4') ||
                    lower.includes('.m4v') ||
                    lower.includes('.webm') ||
                    (lower.includes('fbcdn.net') && lower.includes('video')) ||
                    (lower.includes('cdninstagram.com') && lower.includes('video')) ||
                    (lower.includes('licdn.com') && (lower.includes('video') || lower.includes('playlist') || lower.includes('playback')));

                const looksLikeImage = 
                    lowerKey.includes('image') ||
                    lowerKey.includes('thumbnail') ||
                    lowerKey.includes('cover') ||
                    lower.includes('.jpg') ||
                    lower.includes('.png') ||
                    lower.includes('/image/');

                if (looksLikeVideo && !looksLikeImage && !lower.includes('bytestart')) {
                    found.add(val);
                }
            } else if (typeof val === 'object') {
                // For Facebook progressive streams: prioritize HD and SD playable URLs
                if (val && typeof val === 'object') {
                    if (val.playable_url_quality_hd && typeof val.playable_url_quality_hd === 'string' && !val.playable_url_quality_hd.includes('stream_type=dash')) {
                        found.add(val.playable_url_quality_hd + '#_q=HD_video.mp4');
                    }
                    if (val.playable_url && typeof val.playable_url === 'string' && !val.playable_url.includes('stream_type=dash')) {
                        found.add(val.playable_url + '#_q=SD_video.mp4');
                    }
                    
                    // For LinkedIn progressive streams: extract quality and append as a hash for scoring and downloading
                    if (typeof val.streamingUrl === 'string') {
                        let suffix = '#video.mp4';
                        if (val.height) {
                            suffix = `#_q=${val.height}p_video.mp4`;
                        }
                        found.add(val.streamingUrl + suffix);
                    }
                    if (typeof val.progressiveUrl === 'string') {
                        let suffix = '#video.mp4';
                        if (val.height) {
                            suffix = `#_q=${val.height}p_video.mp4`;
                        }
                        found.add(val.progressiveUrl + suffix);
                    }
                }
                findVideoUrls(val, found, depth + 1);
            }
        }
        return found;
    }

    function dispatchVideoUrls(urls) {
        if (!urls || urls.size === 0) return;
        window.postMessage({ 
            type: 'toystaller_video_urls', 
            urls: Array.from(urls) 
        }, '*');
    }

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
            if (
                url.includes('instagram.com') ||
                url.includes('facebook.com') ||
                url.includes('linkedin.com') ||
                url.includes('graph.') ||
                url.includes('/api/v') ||
                url.includes('graphql') ||
                url.includes('voyager/api') ||
                url.includes('dms.licdn.com')
            ) {
                const clone = response.clone();
                clone.json().then(data => {
                    const foundVideos = findVideoUrls(data);
                    dispatchVideoUrls(foundVideos);
                }).catch(() => {});
            }
        } catch (e) {}
        return response;
    };

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
                    reqUrl.includes('linkedin.com') ||
                    reqUrl.includes('/api/v') ||
                    reqUrl.includes('graphql') ||
                    reqUrl.includes('voyager/api') ||
                    reqUrl.includes('dms.licdn.com')
                ) {
                    const data = JSON.parse(this.responseText);
                    const foundVideos = findVideoUrls(data);
                    dispatchVideoUrls(foundVideos);
                }
            } catch (e) {}
        });
        return xhr;
    }
    PatchedXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    function searchObjForVideoUrl(obj, seen = new Set(), depth = 0, isVideoContext = true) {
        if (depth > 6 || !obj || typeof obj !== 'object') return null;
        if (seen.has(obj)) return null;
        seen.add(obj);

        if (Array.isArray(obj)) {
            for (let item of obj) {
                const res = searchObjForVideoUrl(item, seen, depth + 1, isVideoContext);
                if (res) return res;
            }
        } else {
            for (let key of Object.keys(obj)) {
                if (key === 'return' || key === 'sibling' || key === '_owner' || key === 'parent') continue;

                const val = obj[key];
                if (typeof val === 'string') {
                    const isHttp = val.startsWith('https://') || val.startsWith('http://');
                    if (isHttp && !val.includes('blob:')) {
                        const lowerKey = key.toLowerCase();
                        const isVideoKey = VIDEO_KEYS.has(key) ||
                                           lowerKey.includes('video') ||
                                           lowerKey.includes('stream') ||
                                           lowerKey.includes('playback');
                        const lowerVal = val.toLowerCase();

                        if (isVideoContext && (lowerVal.includes('videocover') || lowerVal.includes('/image/') || lowerVal.includes('.jpg') || lowerVal.includes('.png') || lowerVal.includes('.webp') || lowerVal.includes('.heic'))) {
                            continue;
                        }

                        const looksLikeImage =
                            !isVideoContext && (
                                lowerKey.includes('image') ||
                                lowerKey.includes('thumbnail') ||
                                lowerKey.includes('cover') ||
                                lowerVal.includes('.jpg') ||
                                lowerVal.includes('.png') ||
                                lowerVal.includes('.webp') ||
                                lowerVal.includes('.heic') ||
                                lowerVal.includes('/image/') ||
                                (lowerVal.includes('cdninstagram.com') && !lowerVal.includes('video')) ||
                                (lowerVal.includes('fbcdn.net') && !lowerVal.includes('video') && !lowerVal.includes('.mp4'))
                            );

                        // Reject internal tracking endpoints (e.g., https://www.facebook.com/video/unified_cvc/)
                        // but allow CDN URLs (like *.fbcdn.net, *.cdninstagram.com)
                        const isInternalPage = lowerVal.includes('//www.facebook.com') ||
                                               lowerVal.includes('//facebook.com') ||
                                               lowerVal.includes('//www.instagram.com') ||
                                               lowerVal.includes('//instagram.com');
                        if (isInternalPage) {
                            continue;
                        }

                        // Explicitly skip DASH streams because they aren't playable as standalone files in new tabs
                        if (isVideoContext && (lowerVal.includes('stream_type=dash') || lowerKey.includes('dash_manifest'))) {
                            continue;
                        }

                        const looksLikeVideo =
                            isVideoContext && (
                                isVideoKey ||
                                lowerVal.includes('.mp4') ||
                                lowerVal.includes('.m4v') ||
                                lowerVal.includes('.webm') ||
                                (lowerVal.includes('licdn.com') && (lowerVal.includes('video') || lowerVal.includes('playlist') || lowerVal.includes('playback'))) ||
                                (lowerVal.includes('fbcdn.net') && (lowerVal.includes('video') || lowerVal.includes('.mp4'))) ||
                                (lowerVal.includes('cdninstagram.com') && lowerVal.includes('video'))
                            );

                        if ((looksLikeVideo || looksLikeImage) && !val.includes('bytestart')) {
                            return val;
                        }
                    }
                } else if (typeof val === 'object') {
                    if (val) {
                        // Priority Facebook HD extraction
                        if (isVideoContext && val.playable_url_quality_hd && typeof val.playable_url_quality_hd === 'string' && !val.playable_url_quality_hd.includes('stream_type=dash')) {
                            return val.playable_url_quality_hd + '#_q=HD_video.mp4';
                        }
                        if (isVideoContext && val.playable_url && typeof val.playable_url === 'string' && !val.playable_url.includes('stream_type=dash')) {
                            return val.playable_url + '#_q=SD_video.mp4';
                        }

                        if (typeof val.streamingUrl === 'string') {
                            let suffix = '#video.mp4';
                            if (val.height) {
                                suffix = `#_q=${val.height}p_video.mp4`;
                            }
                            return val.streamingUrl + suffix;
                        }
                        if (typeof val.progressiveUrl === 'string') {
                            let suffix = '#video.mp4';
                            if (val.height) {
                                suffix = `#_q=${val.height}p_video.mp4`;
                            }
                            return val.progressiveUrl + suffix;
                        }
                    }
                    const res = searchObjForVideoUrl(val, seen, depth + 1, isVideoContext);
                    if (res) return res;
                }
            }
        }
        return null;
    }

    function extractVideoUrlFromReact(el, isVideo = true) {
        let current = el;
        for (let i = 0; i < 10 && current; i++) {
            try {
                const key = Object.keys(current).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                if (key && current[key]) {
                    const found = searchObjForVideoUrl(current[key], new Set(), 0, isVideo);
                    if (found) return found;
                }
            } catch (e) {}
            current = current.parentElement;
        }
        return null;
    }

    window.addEventListener('message', (e) => {
        if (!e.data || e.data.type !== 'magic_get_react_url' || !e.data.id) return;
        const id = e.data.id;
        const isVideo = e.data.isVideo !== undefined ? e.data.isVideo : true;
        const el = document.querySelector(`[data-magic-id="${id}"]`);

        let url = null;
        if (el) {
            url = extractVideoUrlFromReact(el, isVideo);
        }

        window.postMessage({
            type: 'magic_response_react_url_' + id,
            url: url
        }, '*');
    });

})();
