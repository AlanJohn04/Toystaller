// extensions/global/platforms/instagram.js
// Instagram platform config for the global extension (MAIN world).
// Sets window.ToystallerPlatforms registry.

window.ToystallerPlatforms = window.ToystallerPlatforms || {};
window.ToystallerPlatforms['instagram'] = {
    name: 'Instagram',
    version: 'v6.0',
    specialization: 'High-res image and video downloads for Instagram Feed, Reels, Stories, and DMs. Uses React Fiber extraction for accurate CDN links.',

    getPlatformConfig(path) {
        if (path.includes('/direct/')) return { preferredCorners: ['top-left', 'top-right'], padding: 8 };
        if (path.includes('/reels/') || path.includes('/reel/')) return { preferredCorners: ['top-left', 'bottom-left'], padding: 12 };
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

    hasActiveModal() { return document.querySelector('[role="dialog"]') !== null; },
    isInsideModal(media) {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) { if (dialog.contains(media)) return true; }
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
            if (media.closest('[role="list"], [role="listbox"], [role="navigation"]')) return true;
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

    getButtonScale(media) {
        if (window.location.pathname.toLowerCase().includes('/direct/')) return 0.75;
        const rect = media.getBoundingClientRect();
        const minSide = Math.min(rect.width, rect.height);
        if (minSide < 180) return 0.85;
        if (minSide < 280) return 0.95;
        return 1;
    },

    useDirectDownload: false,
    useReactThumbnail: true,
    isInternalUrl(url) { const l = (url||'').toLowerCase(); return l.includes('//www.instagram.com') || l.includes('//instagram.com'); },
    filterBackgroundUrls(candidates, isVideo) {
        return candidates.filter(u => { const l = u.toLowerCase(); if (l.includes('/image/') || l.includes('.jpg') || l.includes('.png') || l.includes('.webp')) return false; return l.includes('cdninstagram.com') || l.includes('.mp4'); });
    },

    getInterceptUrls() { return ['instagram.com', 'graph.', '/api/v', 'graphql']; },
    shouldSkipReactValue(val) { const l = val.toLowerCase(); return l.includes('//www.instagram.com') || l.includes('//instagram.com'); },
    looksLikeReactImage(val, key) { const lv = val.toLowerCase(); const lk = key.toLowerCase(); return lk.includes('image') || lk.includes('thumbnail') || lk.includes('cover') || lv.includes('.jpg') || lv.includes('.png') || lv.includes('.webp') || lv.includes('.heic') || lv.includes('/image/') || (lv.includes('cdninstagram.com') && !lv.includes('video')); },
    looksLikeReactVideo(val) { const l = val.toLowerCase(); return (l.includes('cdninstagram.com') && l.includes('video')) || l.includes('.mp4'); },
    extractPriorityReactUrl(val) { if (val && typeof val.streamingUrl === 'string') { let s = '#video.mp4'; if (val.height) s = `#_q=${val.height}p_video.mp4`; return val.streamingUrl + s; } if (val && typeof val.progressiveUrl === 'string') { let s = '#video.mp4'; if (val.height) s = `#_q=${val.height}p_video.mp4`; return val.progressiveUrl + s; } return null; },
    extractVideoUrlFromDOM() { return null; }
};
