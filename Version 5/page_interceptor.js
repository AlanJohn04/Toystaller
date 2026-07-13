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
        'playable_url', 'playable_url_quality_hd',
        'adaptiveStreams', 'mediaUrl',
        'media', 'rootUrl', 'liveVideoUrl', 'thumbnail'
    ]);

    function isValidVideo(url) {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
        if (url.includes('stream_type=dash') || url.includes('.mpd')) return false;
        const lower = url.toLowerCase();
        return !(lower.includes('//www.facebook.com') || 
                 lower.includes('//facebook.com') ||
                 lower.includes('//www.instagram.com') || 
                 lower.includes('//instagram.com') ||
                 lower.includes('//www.linkedin.com') || 
                 lower.includes('//linkedin.com'));
    }

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

                // Reject unplayable streaming formats (DASH/HLS) — they cause black screens in new tabs
                if (lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('stream_type=dash') || lower.includes('dash_manifest')) {
                    continue;
                }

                const looksLikeVideo =
                    isVideoKey ||
                    lower.includes('.mp4') ||
                    lower.includes('.m4v') ||
                    lower.includes('.webm') ||
                    (lower.includes('fbcdn.net') && lower.includes('video')) ||
                    (lower.includes('cdninstagram.com') && lower.includes('video')) ||
                    (lower.includes('licdn.com') && (lower.includes('video') || lower.includes('playback')));

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
                    
                    // Facebook Reels: progressive_urls array contains merged video+audio mp4
                    if (Array.isArray(val.progressive_urls)) {
                        for (const prog of val.progressive_urls) {
                            if (prog && typeof prog.progressive_url === 'string') {
                                const quality = (prog.metadata && prog.metadata.quality) || '';
                                found.add(prog.progressive_url + `#_q=${quality}_video.mp4`);
                            }
                        }
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
        if (depth > 12 || !obj || typeof obj !== 'object') return null;
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

                        // Explicitly skip DASH/HLS streams because they aren't playable as standalone files in new tabs
                        if (isVideoContext && (lowerVal.includes('stream_type=dash') || lowerKey.includes('dash_manifest') || lowerVal.includes('.m3u8') || lowerVal.includes('.mpd'))) {
                            continue;
                        }

                        const looksLikeVideo =
                            isVideoContext && (
                                isVideoKey ||
                                lowerVal.includes('.mp4') ||
                                lowerVal.includes('.m4v') ||
                                lowerVal.includes('.webm') ||
                                (lowerVal.includes('licdn.com') && (lowerVal.includes('video') || lowerVal.includes('playback'))) ||
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

                        // Facebook Reels: progressive_urls array contains merged video+audio mp4
                        if (isVideoContext && Array.isArray(val.progressive_urls)) {
                            let bestProgUrl = null;
                            for (const prog of val.progressive_urls) {
                                if (prog && typeof prog.progressive_url === 'string') {
                                    bestProgUrl = prog.progressive_url;
                                }
                            }
                            if (bestProgUrl) return bestProgUrl + '#_q=progressive_video.mp4';
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
        // LinkedIn DOM fallback: check for data-sources attribute on or near the video element
        if (isVideo) {
            let dsEl = el;
            for (let i = 0; i < 5 && dsEl; i++) {
                const ds = dsEl.getAttribute && dsEl.getAttribute('data-sources');
                if (ds) {
                    try {
                        const sources = JSON.parse(ds);
                        if (Array.isArray(sources)) {
                            // Pick the highest bitrate progressive mp4
                            let best = null;
                            let bestBitrate = -1;
                            for (const src of sources) {
                                if (src && src.src && typeof src.src === 'string' && isValidVideo(src.src)) {
                                    // Additionally ensure it's not a manifest by checking the type if available
                                    if (src.type && (src.type.includes('mpegurl') || src.type.includes('dash'))) continue;
                                    
                                    const bitrate = parseInt(src['data-bitrate'] || '0', 10);
                                    if (bitrate > bestBitrate) {
                                        bestBitrate = bitrate;
                                        best = src.src;
                                    }
                                }
                            }
                            if (best) return best + '#_q=progressive_video.mp4';
                        }
                    } catch (e) {}
                }
                dsEl = dsEl.parentElement;
            }
        }

        // React Fiber crawl
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

        // Facebook Relay Data fallback: scan <script> tags for embedded video data
        // yt-dlp does this via data-sjs regex; we parse all script[type="application/json"] and data-sjs scripts
        if (isVideo && window.location.hostname.includes('facebook.com')) {
            const fbUrl = extractFromFacebookRelayData();
            if (fbUrl) return fbUrl;
        }

        return null;
    }

    // Facebook-specific: Parse relay data from <script> tags to find progressive video URLs
    // This mirrors yt-dlp's extract_relay_prefetched_data approach
    function extractFromFacebookRelayData() {
        const scripts = document.querySelectorAll('script');
        let bestUrl = null;
        let bestQuality = -1;
        const seen = new Set();

        const checkAndSet = (url, q) => {
            if (isValidVideo(url) && q > bestQuality) {
                bestQuality = q;
                bestUrl = url;
            }
        };

        for (const script of scripts) {
            const text = script.textContent;
            if (!text || text.length < 100) continue;
            // Quick check: does this script even contain video data?
            if (!text.includes('playable_url') && !text.includes('progressive_url')) continue;

            try {
                const data = JSON.parse(text);
                scanRelayDataForVideoUrls(data, 0, seen, checkAndSet);
            } catch (e) {
                // If JSON parsing fails (e.g., wrapped in handleServerJS), fallback to Regex extraction
                try {
                    const hdMatch = text.match(/"playable_url_quality_hd"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                    if (hdMatch && hdMatch[1]) {
                        const url = JSON.parse('"' + hdMatch[1] + '"'); // unescape string
                        checkAndSet(url + '#_q=HD_video.mp4', 3);
                    }
                    
                    const sdMatch = text.match(/"playable_url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                    if (sdMatch && sdMatch[1]) {
                        const url = JSON.parse('"' + sdMatch[1] + '"');
                        checkAndSet(url + '#_q=SD_video.mp4', 2);
                    }
                } catch (err) {}
            }
        }
        return bestUrl;
    }

    function scanRelayDataForVideoUrls(obj, depth, seen, onFound) {
        if (depth > 15 || !obj || typeof obj !== 'object') return;
        if (seen.has(obj)) return;
        seen.add(obj);

        if (Array.isArray(obj)) {
            for (const item of obj) {
                scanRelayDataForVideoUrls(item, depth + 1, seen, onFound);
            }
            return;
        }

        // Priority 1: playable_url_quality_hd (HD progressive mp4)
        if (obj.playable_url_quality_hd && typeof obj.playable_url_quality_hd === 'string') {
            const url = obj.playable_url_quality_hd;
            if (isValidVideo(url)) {
                onFound(url + '#_q=HD_video.mp4', 3);
            }
        }

        // Priority 2: playable_url (SD progressive mp4)
        if (obj.playable_url && typeof obj.playable_url === 'string') {
            const url = obj.playable_url;
            if (isValidVideo(url)) {
                onFound(url + '#_q=SD_video.mp4', 2);
            }
        }

        // Priority 3: progressive_urls array from videoDeliveryResponseResult
        if (Array.isArray(obj.progressive_urls)) {
            for (const prog of obj.progressive_urls) {
                if (prog && typeof prog.progressive_url === 'string') {
                    if (isValidVideo(prog.progressive_url)) {
                        const quality = (prog.metadata && prog.metadata.quality) || '';
                        const qScore = quality.toLowerCase() === 'hd' ? 3 : 1;
                        onFound(prog.progressive_url + `#_q=${quality}_video.mp4`, qScore);
                    }
                }
            }
        }

        // Recurse into child objects
        for (const key of Object.keys(obj)) {
            if (key === 'return' || key === 'sibling' || key === '_owner' || key === 'parent') continue;
            const val = obj[key];
            if (val && typeof val === 'object') {
                scanRelayDataForVideoUrls(val, depth + 1, seen, onFound);
            }
        }
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
