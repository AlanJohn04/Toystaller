// extensions/global/platforms/facebook.js
// Facebook platform configuration for the global extension.

(function() {
    window.ToystallerPlatforms = window.ToystallerPlatforms || {};
    const facebookPlatform = {
        name: 'Facebook',
        version: 'v6.0',
        specialization: 'Progressive MP4 downloads for Facebook Reels, Watch, and Feed. Bypasses DASH streaming restrictions using mobile UA spoofing.',

        // --- Content Script Interface ---

        getPlatformConfig(path) {
            if (path.includes('/reel')) {
                return { preferredCorners: ['top-right', 'top-left', 'bottom-left', 'bottom-right'], padding: 14, topOffset: 56 };
            }
            return { preferredCorners: ['top-left', 'top-right', 'bottom-left'], padding: 12 };
        },

        getContext(path) {
            if (path.includes('/watch')) return 'fb-watch';
            if (path.includes('/reel/')) return 'fb-reels';
            if (path.includes('/stories/')) return 'fb-stories';
            if (path.includes('/groups/')) return 'fb-groups';
            return 'fb-feed';
        },

        hasActiveModal() {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.some(d => {
                const rect = d.getBoundingClientRect();
                return rect.width > 400 && rect.height > 400 && rect.top < 100;
            });
        },

        isInsideModal(media) {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            const actualModals = dialogs.filter(d => {
                const rect = d.getBoundingClientRect();
                return rect.width > 400 && rect.height > 400 && rect.top < 100;
            });
            for (const dialog of actualModals) {
                if (dialog.contains(media)) return true;
            }
            return false;
        },

        isThumbnail(media) {
            if (media.tagName.toLowerCase() !== 'img') return false;
            const rect = media.getBoundingClientRect();
            const naturalW = media.naturalWidth || media.width;
            const naturalH = media.naturalHeight || media.height;
            if (naturalW >= 200 && naturalH >= 200) return false;
            if (naturalW < 100 || naturalH < 100) return true;
            if (rect.width < 100 || rect.height < 100) return true;
            if (media.closest('svg') || media.getAttribute('data-imgperflogname')) {
                if (rect.width < 120) return true;
            }
            return false;
        },

        getButtonScale(media) {
            const rect = media.getBoundingClientRect();
            const minSide = Math.min(rect.width, rect.height);
            if (minSide < 180) return 0.85;
            if (minSide < 280) return 0.95;
            return 1;
        },

        // Facebook CDN links fail in new tabs — use direct download
        useDirectDownload: true,

        // Facebook uses React Fiber for thumbnail extraction
        useReactThumbnail: true,

        isInternalUrl(url) {
            const lower = (url || '').toLowerCase();
            return lower.includes('//www.facebook.com') ||
                   lower.includes('//facebook.com') ||
                   lower.includes('//www.instagram.com') ||
                   lower.includes('//instagram.com');
        },

        // Facebook-specific: Try mobile site extraction if React Fiber fails
        fetchVideoFallback(pageUrl, safeSendMessage, callback) {
            safeSendMessage({ action: 'fetchMobileFacebookVideo', url: pageUrl }, (response) => {
                if (response && response.url) {
                    callback(response.url);
                } else {
                    callback(null);
                }
            });
        },

        filterBackgroundUrls(candidates, isVideo) {
            return candidates.filter(u => {
                const lower = u.toLowerCase();
                if (isVideo && (lower.includes('/image/') || lower.includes('.jpg') || lower.includes('.png'))) return false;
                if (lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('stream_type=dash')) return false;
                return (lower.includes('fbcdn.net') || lower.includes('.mp4')) && !lower.includes('bytestart');
            });
        },

        // --- Interceptor Interface (MAIN world) ---

        getInterceptUrls() {
            return ['facebook.com', 'graph.', '/api/v', 'graphql'];
        },

        shouldSkipReactValue(val, key, isVideoContext) {
            const lowerVal = val.toLowerCase();
            const lowerKey = key.toLowerCase();

            const isInternalPage = lowerVal.includes('//www.facebook.com') ||
                                   lowerVal.includes('//facebook.com') ||
                                   lowerVal.includes('//www.instagram.com') ||
                                   lowerVal.includes('//instagram.com');
            if (isInternalPage) return true;

            if (isVideoContext && (lowerVal.includes('stream_type=dash') || lowerKey.includes('dash_manifest'))) {
                return true;
            }
            return false;
        },

        looksLikeReactImage(val, key) {
            const lowerVal = val.toLowerCase();
            const lowerKey = key.toLowerCase();
            return (
                lowerKey.includes('image') ||
                lowerKey.includes('thumbnail') ||
                lowerKey.includes('cover') ||
                lowerVal.includes('.jpg') ||
                lowerVal.includes('.png') ||
                lowerVal.includes('.webp') ||
                lowerVal.includes('.heic') ||
                lowerVal.includes('/image/') ||
                (lowerVal.includes('fbcdn.net') && !lowerVal.includes('video') && !lowerVal.includes('.mp4'))
            );
        },

        looksLikeReactVideo(val, key) {
            const lowerVal = val.toLowerCase();
            return (lowerVal.includes('fbcdn.net') && (lowerVal.includes('video') || lowerVal.includes('.mp4'))) || lowerVal.includes('.mp4');
        },

        extractPriorityReactUrl(val, isVideoContext) {
            if (isVideoContext && val.playable_url_quality_hd && typeof val.playable_url_quality_hd === 'string' && !val.playable_url_quality_hd.includes('stream_type=dash')) {
                return val.playable_url_quality_hd + '#_q=HD_video.mp4';
            }
            if (isVideoContext && val.playable_url && typeof val.playable_url === 'string' && !val.playable_url.includes('stream_type=dash')) {
                return val.playable_url + '#_q=SD_video.mp4';
            }
            if (val && typeof val.streamingUrl === 'string') {
                let suffix = '#video.mp4';
                if (val.height) suffix = `#_q=${val.height}p_video.mp4`;
                return val.streamingUrl + suffix;
            }
            if (val && typeof val.progressiveUrl === 'string') {
                let suffix = '#video.mp4';
                if (val.height) suffix = `#_q=${val.height}p_video.mp4`;
                return val.progressiveUrl + suffix;
            }
            return null;
        },

        isValidVideo(url) {
            if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
            if (url.includes('stream_type=dash') || url.includes('.mpd')) return false;
            const lower = url.toLowerCase();
            return !(lower.includes('//www.facebook.com') ||
                     lower.includes('//facebook.com') ||
                     lower.includes('//www.instagram.com') ||
                     lower.includes('//instagram.com'));
        },

        extractVideoUrlFromDOM(el) {
            // Scan Facebook's <script> relay data for playable_url / progressive_url
            const scripts = document.querySelectorAll('script');
            let bestUrl = null;
            let bestQuality = -1;
            const seen = new Set();

            const checkAndSet = (url, q) => {
                if (this.isValidVideo(url) && q > bestQuality) {
                    bestQuality = q;
                    bestUrl = url;
                }
            };

            const scanRelayData = (obj, depth) => {
                if (depth > 15 || !obj || typeof obj !== 'object') return;
                if (seen.has(obj)) return;
                seen.add(obj);

                if (Array.isArray(obj)) {
                    for (const item of obj) scanRelayData(item, depth + 1);
                    return;
                }

                if (obj.playable_url_quality_hd && typeof obj.playable_url_quality_hd === 'string') {
                    checkAndSet(obj.playable_url_quality_hd + '#_q=HD_video.mp4', 3);
                }
                if (obj.playable_url && typeof obj.playable_url === 'string') {
                    checkAndSet(obj.playable_url + '#_q=SD_video.mp4', 2);
                }
                if (Array.isArray(obj.progressive_urls)) {
                    for (const prog of obj.progressive_urls) {
                        if (prog && typeof prog.progressive_url === 'string') {
                            const quality = (prog.metadata && prog.metadata.quality) || '';
                            checkAndSet(prog.progressive_url + `#_q=${quality}_video.mp4`, quality.toLowerCase() === 'hd' ? 3 : 1);
                        }
                    }
                }
                if (obj.progressive_url && typeof obj.progressive_url === 'string') {
                    checkAndSet(obj.progressive_url + '#_q=progressive_video.mp4', 1);
                }

                for (const key of Object.keys(obj)) {
                    if (key === 'return' || key === 'sibling' || key === '_owner' || key === 'parent') continue;
                    if (obj[key] && typeof obj[key] === 'object') scanRelayData(obj[key], depth + 1);
                }
            };

            for (const script of scripts) {
                const text = script.textContent;
                if (!text || text.length < 100) continue;
                if (!text.includes('playable_url') && !text.includes('progressive_url')) continue;

                try {
                    scanRelayData(JSON.parse(text), 0);
                } catch (e) {
                    try {
                        const hdMatch = text.match(/"playable_url_quality_hd"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                        if (hdMatch && hdMatch[1]) checkAndSet(JSON.parse('"' + hdMatch[1] + '"') + '#_q=HD_video.mp4', 3);
                        const sdMatch = text.match(/"playable_url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
                        if (sdMatch && sdMatch[1]) checkAndSet(JSON.parse('"' + sdMatch[1] + '"') + '#_q=SD_video.mp4', 2);
                    } catch (err) {}
                }
            }
            return bestUrl;
        }
    };

    if (typeof window !== 'undefined') {
        window.ToystallerPlatforms['facebook'] = facebookPlatform;
    }
})();
