window.ToystallerPlatforms = window.ToystallerPlatforms || {};

window.ToystallerPlatforms['instagram'] = Object.assign({}, window.ToystallerPlatforms['generic'], {
    name: 'instagram',
    
    getPlatformConfig(path) {
        if (path.includes('/direct/')) {
            return { preferredCorners: ['top-left', 'top-right'], padding: 8 };
        }
        if (path.includes('/reels/') || path.includes('/reel/')) {
            return { preferredCorners: ['top-left', 'bottom-left'], padding: 12 };
        }
        return { preferredCorners: ['top-left', 'bottom-left', 'top-right'], padding: 12 };
    },

    getContext(path) {
        if (path === '/' || path === '') return 'ig-home';
        if (path.includes('/direct/')) return 'ig-dm';
        if (path.includes('/reels/') || path.includes('/reel/')) return 'ig-reels';
        if (path.includes('/stories/')) return 'ig-stories';
        if (path.includes('/p/')) return 'ig-post-modal';
        return 'ig-profile';
    },

    hasActiveModal() {
        return document.querySelector('[role="dialog"]') !== null;
    },

    isInsideModal(media) {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
            if (dialog.contains(media)) return true;
        }
        return false;
    },

    isThumbnail(media) {
        if (media.tagName.toLowerCase() !== 'img') return false;
        const rect = media.getBoundingClientRect();
        const naturalW = media.naturalWidth || media.width;
        const naturalH = media.naturalHeight || media.height;
        
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/direct/')) {
            if (rect.width < 250 || rect.height < 200) return true;
            const style = window.getComputedStyle(media);
            if (style.borderRadius && (style.borderRadius.includes('50%') || parseInt(style.borderRadius) > 40)) return true;
            const chatListParent = media.closest('[role="list"], [role="listbox"], [role="navigation"]');
            if (chatListParent) return true;
            if (media.closest('a[href]') && rect.width < 300) return true;
            if (media.closest('[role="button"]')) return true;
            const role = (media.getAttribute('role') || '').toLowerCase();
            if (role === 'presentation' || role === 'none') return true;
            return false;
        }
        
        if (naturalW >= 200 && naturalH >= 200) return false;
        if (naturalW < 100 || naturalH < 100) return true;
        if (rect.width < 100 || rect.height < 100) return true;
        const role = (media.getAttribute('role') || '').toLowerCase();
        if (role === 'presentation' || role === 'none') return true;
        if (media.closest('a[href]') && rect.width < 250) return true;
        return false;
    },

    // React Extraction
    shouldSkipReactValue(val, key, isVideoContext) {
        const lowerVal = val.toLowerCase();
        const isInternalPage = lowerVal.includes('//www.instagram.com') || lowerVal.includes('//instagram.com');
        return isInternalPage;
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
            lowerVal.includes('/image/') ||
            (lowerVal.includes('cdninstagram.com') && !lowerVal.includes('video'))
        );
    },

    looksLikeReactVideo(val, key) {
        const lowerVal = val.toLowerCase();
        return (lowerVal.includes('cdninstagram.com') && lowerVal.includes('video')) || lowerVal.includes('.mp4');
    },

    getButtonScale(media) {
        if (window.location.pathname.toLowerCase().includes('/direct/')) return 0.75;
        const rect = media.getBoundingClientRect();
        const minSide = Math.min(rect.width, rect.height);
        if (minSide < 180) return 0.85;
        if (minSide < 280) return 0.95;
        return 1;
    }
});
