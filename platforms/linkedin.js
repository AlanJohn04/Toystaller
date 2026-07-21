window.ToystallerPlatforms = window.ToystallerPlatforms || {};

window.ToystallerPlatforms['linkedin'] = Object.assign({}, window.ToystallerPlatforms['generic'], {
    name: 'linkedin',
    
    getPlatformConfig(path) {
        return { preferredCorners: ['top-left', 'top-right', 'bottom-right'], padding: 12 };
    },

    getContext(path) {
        return 'linkedin';
    },

    // React Extraction
    getReactVideoKeys() {
        return ['adaptiveStreams', 'progressiveStreams', 'mediaUrl', 'rootUrl', 'liveVideoUrl', ...window.ToystallerPlatforms['generic'].getReactVideoKeys()];
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
            lowerVal.includes('/image/')
        );
    },

    looksLikeReactVideo(val, key) {
        const lowerVal = val.toLowerCase();
        return (lowerVal.includes('licdn.com') && (lowerVal.includes('video') || lowerVal.includes('playlist') || lowerVal.includes('playback'))) || lowerVal.includes('.mp4');
    },

    isValidVideo(url) {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
        if (url.includes('stream_type=dash') || url.includes('.mpd')) return false;
        const lower = url.toLowerCase();
        return !(lower.includes('//www.facebook.com') || 
                 lower.includes('//facebook.com') ||
                 lower.includes('//www.instagram.com') || 
                 lower.includes('//instagram.com') ||
                 lower.includes('//www.linkedin.com') || 
                 lower.includes('//linkedin.com'));
    },

    extractVideoUrlFromDOM(el) {
        if (el.tagName === 'VIDEO') {
            const sourcesData = el.getAttribute('data-sources');
            if (sourcesData) {
                try {
                    const sources = JSON.parse(sourcesData);
                    if (Array.isArray(sources)) {
                        let best = null;
                        let bestBitrate = -1;
                        for (const src of sources) {
                            if (src && src.src && typeof src.src === 'string' && this.isValidVideo(src.src)) {
                                if (!src.src.includes('.mp4') || src.src.includes('manifest')) continue;
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
        }
        return null;
    },

    // Network Fallback Filtering
    filterBackgroundUrls(candidates, isVideo) {
        return candidates.filter(u => {
            const lower = u.toLowerCase();
            if (isVideo && (lower.includes('videocover') || lower.includes('/image/') || lower.includes('.jpg') || lower.includes('.png') || lower.includes('.webp'))) {
                return false;
            }
            // Reject streaming manifests and DASH fragments
            if (lower.includes('.m3u8') || lower.includes('.mpd') || lower.includes('stream_type=dash') || lower.includes('bytestart')) {
                return false;
            }
            return (lower.includes('licdn.com') && (lower.includes('video') || lower.includes('playback'))) || lower.includes('.mp4');
        });
    }
});
