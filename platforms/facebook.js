window.ToystallerPlatforms = window.ToystallerPlatforms || {};

window.ToystallerPlatforms['facebook'] = Object.assign({}, window.ToystallerPlatforms['generic'], {
    name: 'facebook',
    
    getPlatformConfig(path) {
        if (path.includes('/reel/')) {
            return { preferredCorners: ['top-left', 'top-right'], padding: 16 };
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
        const actualModals = dialogs.filter(d => {
            const rect = d.getBoundingClientRect();
            return rect.width > 400 && rect.height > 400 && rect.top < 100;
        });
        return actualModals.length > 0;
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

    // React Extraction
    getReactVideoKeys() {
        return ['playable_url', 'playable_url_quality_hd', ...window.ToystallerPlatforms['generic'].getReactVideoKeys()];
    },

    shouldSkipReactValue(val, key, isVideoContext) {
        const lowerVal = val.toLowerCase();
        const lowerKey = key.toLowerCase();
        
        // Reject internal tracking endpoints
        const isInternalPage = lowerVal.includes('//www.facebook.com') ||
                               lowerVal.includes('//facebook.com') ||
                               lowerVal.includes('//www.instagram.com') ||
                               lowerVal.includes('//instagram.com');
        if (isInternalPage) {
            return true;
        }
        
        // Explicitly skip DASH streams because they aren't playable as standalone files in new tabs
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
        return window.ToystallerPlatforms['generic'].extractPriorityReactUrl(val, isVideoContext);
    },

    // Network Fallback Filtering
    filterBackgroundUrls(candidates, isVideo) {
        return candidates.filter(u => {
            const lower = u.toLowerCase();
            if (isVideo && (lower.includes('/image/') || lower.includes('.jpg') || lower.includes('.png'))) return false;
            return (lower.includes('fbcdn.net') || lower.includes('.mp4')) && !lower.includes('bytestart') && !lower.includes('stream_type=dash');
        });
    }
});
