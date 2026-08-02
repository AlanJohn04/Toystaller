// extensions/whatsapp/platform.js
// WhatsApp Web platform configuration.
// WhatsApp Web uses blob: URLs for media backed by encrypted CDN downloads.
// Strategy: Intercept decrypted blob URLs at the point WhatsApp's JS renders them,
// and extract media from the DOM and React component tree.

(function() {
    const whatsappPlatform = {
        name: 'WhatsApp',
        version: 'v6.0',
        specialization: 'Downloads encrypted media blobs directly from WhatsApp Web, intercepting CDN URLs for status updates and chats.',

        // --- Content Script Interface ---

        getPlatformConfig(path) {
            return { preferredCorners: ['top-right', 'top-left', 'bottom-right'], padding: 10 };
        },

        getContext(path) {
            return 'whatsapp';
        },

        hasActiveModal() {
            // WhatsApp image/video viewer uses a full-screen overlay
            const mediaViewer = document.querySelector('[data-testid="media-viewer"]') ||
                                document.querySelector('.overlay, ._3YS8Q, [role="dialog"]');
            return !!mediaViewer;
        },

        isInsideModal(media) {
            const mediaViewer = document.querySelector('[data-testid="media-viewer"]') ||
                                document.querySelector('.overlay, ._3YS8Q, [role="dialog"]');
            return mediaViewer ? mediaViewer.contains(media) : false;
        },

        isThumbnail(media) {
            if (media.tagName.toLowerCase() !== 'img') return false;
            const rect = media.getBoundingClientRect();

            // WhatsApp profile pictures and status icons
            const style = window.getComputedStyle(media);
            if (style.borderRadius && (style.borderRadius.includes('50%') || parseInt(style.borderRadius) > 40)) return true;

            // Small avatars in chat list
            if (rect.width < 80 || rect.height < 80) return true;

            // Emoji images and reaction icons
            const alt = (media.getAttribute('alt') || '').toLowerCase();
            if (alt.includes('emoji') || alt.includes('sticker')) return true;

            // WhatsApp UI icons
            const src = (media.src || '').toLowerCase();
            if (src.includes('data:image/svg') || src.includes('emoji')) return true;

            return false;
        },

        getButtonScale(media) {
            const rect = media.getBoundingClientRect();
            const minSide = Math.min(rect.width, rect.height);
            if (minSide < 180) return 0.85;
            if (minSide < 280) return 0.95;
            return 1;
        },

        // WhatsApp blob: URLs work with direct download via chrome.downloads
        useDirectDownload: true,

        useReactThumbnail: false,

        isInternalUrl(url) {
            const lower = (url || '').toLowerCase();
            return lower.includes('//web.whatsapp.com') && !lower.includes('mmg.whatsapp.net');
        },

        filterBackgroundUrls(candidates, isVideo) {
            return candidates.filter(u => {
                const lower = u.toLowerCase();
                // WhatsApp media is served from mmg.whatsapp.net or mmg-fna.whatsapp.net
                if (lower.includes('mmg.whatsapp.net') || lower.includes('mmg-fna.whatsapp.net')) return true;
                if (isVideo && lower.includes('.mp4')) return true;
                return false;
            });
        },

        // --- Interceptor Interface (MAIN world) ---

        getInterceptUrls() {
            return ['web.whatsapp.com', 'mmg.whatsapp.net', 'mmg-fna.whatsapp.net'];
        },

        shouldSkipReactValue(val, key, isVideoContext) {
            const lowerVal = val.toLowerCase();
            // Skip WhatsApp internal navigation URLs
            if (lowerVal.includes('//web.whatsapp.com') && !lowerVal.includes('mmg')) return true;
            return false;
        },

        looksLikeReactImage(val, key) {
            const lowerVal = val.toLowerCase();
            const lowerKey = key.toLowerCase();
            return (
                lowerKey.includes('image') ||
                lowerKey.includes('thumbnail') ||
                lowerKey.includes('preview') ||
                lowerVal.includes('.jpg') ||
                lowerVal.includes('.jpeg') ||
                lowerVal.includes('.png') ||
                lowerVal.includes('.webp') ||
                (lowerVal.includes('mmg') && !lowerVal.includes('video'))
            );
        },

        looksLikeReactVideo(val, key) {
            const lowerVal = val.toLowerCase();
            return (lowerVal.includes('mmg') && lowerVal.includes('video')) ||
                   lowerVal.includes('.mp4') ||
                   lowerVal.includes('.webm');
        },

        extractPriorityReactUrl(val, isVideoContext) {
            // WhatsApp sometimes stores media info in objects with url/directPath properties
            if (val && typeof val.url === 'string' && val.url.startsWith('http')) {
                return val.url;
            }
            if (val && typeof val.directPath === 'string' && val.directPath.startsWith('/')) {
                return 'https://mmg.whatsapp.net' + val.directPath;
            }
            return null;
        },

        extractVideoUrlFromDOM(el) {
            // WhatsApp videos often have a direct src that's a blob URL.
            // We try to find the download button's data or a nearby link.
            if (el.tagName === 'VIDEO') {
                // Check for source elements with non-blob src
                const sources = el.querySelectorAll('source');
                for (const source of sources) {
                    if (source.src && !source.src.startsWith('blob:') && !source.src.startsWith('data:')) {
                        return source.src;
                    }
                }
            }
            return null;
        }
    };

    if (typeof window !== 'undefined') {
        window.ToystallerPlatform = whatsappPlatform;
        window.ToystallerActivePlatform = whatsappPlatform;
    }
})();
