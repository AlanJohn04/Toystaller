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
            lowerVal.includes('/image/')
        );
    },

    looksLikeReactVideo(val, key) {
        const lowerVal = val.toLowerCase();
        return (lowerVal.includes('licdn.com') && (lowerVal.includes('video') || lowerVal.includes('playlist') || lowerVal.includes('playback'))) || lowerVal.includes('.mp4');
    },

    // Network Fallback Filtering
    filterBackgroundUrls(candidates, isVideo) {
        return candidates.filter(u => {
            const lower = u.toLowerCase();
            if (isVideo && (lower.includes('videocover') || lower.includes('/image/') || lower.includes('.jpg') || lower.includes('.png'))) {
                return false;
            }
            return (lower.includes('licdn.com') || lower.includes('.mp4')) && !lower.includes('bytestart');
        });
    }
});
