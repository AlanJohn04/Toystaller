// extensions/global/platforms/linkedin.js
window.ToystallerPlatforms = window.ToystallerPlatforms || {};
window.ToystallerPlatforms['linkedin'] = {
    name: 'LinkedIn',
    version: 'v6.0',
    specialization: 'High-res image and direct video downloads for LinkedIn Feed and Profiles. Bypasses LinkedIn CDN 403 errors using Chrome Downloads API.',
    getPlatformConfig() { return { preferredCorners: ['top-left', 'top-right', 'bottom-right'], padding: 12 }; },
    getContext(path) { if (path.includes('/feed/')) return 'li-feed'; if (path.includes('/messaging/')) return 'li-messaging'; return 'linkedin'; },
    hasActiveModal() { const m = document.querySelectorAll('.artdeco-modal, [role="dialog"]'); for (const modal of m) { const r = modal.getBoundingClientRect(); if (r.width > 400 && r.height > 400) return true; } return false; },
    isInsideModal(media) { const m = document.querySelectorAll('.artdeco-modal, [role="dialog"]'); for (const modal of m) { const r = modal.getBoundingClientRect(); if (r.width > 400 && r.height > 400 && modal.contains(media)) return true; } return false; },
    isThumbnail(media) { if (media.tagName.toLowerCase() !== 'img') return false; const r = media.getBoundingClientRect(); const nW = media.naturalWidth || media.width; const nH = media.naturalHeight || media.height; if (nW >= 200 && nH >= 200) return false; if (nW < 100 || nH < 100) return true; if (r.width < 100 || r.height < 100) return true; const s = window.getComputedStyle(media); if (s.borderRadius && (s.borderRadius.includes('50%') || parseInt(s.borderRadius) > 40)) return true; return false; },
    getButtonScale(media) { const r = media.getBoundingClientRect(); const m = Math.min(r.width, r.height); if (m < 180) return 0.85; if (m < 280) return 0.95; return 1; },
    useDirectDownload: true,
    useReactThumbnail: false,
    isInternalUrl(url) { const l = (url||'').toLowerCase(); return l.includes('//www.linkedin.com') || l.includes('//linkedin.com'); },
    upgradeImageUrl(url) { if (url && url.includes('media.licdn.com/dms/image')) return url.replace(/\/(100|200|400|800)\//g, '/1000/'); return url; },
    extractThumbnail(media, interceptedUrls, safeSendMessage, callback) { if (interceptedUrls.size > 0) { const c = Array.from(interceptedUrls).filter(u => u.includes('videocover')); if (c.length > 0) { callback(c[0]); return; } } safeSendMessage({ action: 'getMediaUrls', mediaType: 'img' }, (r) => { if (r && r.urls) { const c = r.urls.filter(u => u.includes('videocover')); if (c.length > 0) { callback(c[0]); return; } } callback(null); }); },
    filterBackgroundUrls(candidates, isVideo) { return candidates.filter(u => { const l = u.toLowerCase(); if (isVideo && (l.includes('videocover') || l.includes('/image/') || l.includes('.jpg') || l.includes('.png') || l.includes('.webp'))) return false; if (l.includes('.m3u8') || l.includes('.mpd') || l.includes('stream_type=dash') || l.includes('bytestart')) return false; return (l.includes('licdn.com') && (l.includes('video') || l.includes('playback'))) || l.includes('.mp4'); }); },
    getInterceptUrls() { return ['linkedin.com', '/api/v', 'voyager/api', 'dms.licdn.com']; },
    shouldSkipReactValue(val) { const l = val.toLowerCase(); return l.includes('//www.linkedin.com') || l.includes('//linkedin.com'); },
    looksLikeReactImage(val, key) { const lv = val.toLowerCase(); const lk = key.toLowerCase(); return lk.includes('image') || lk.includes('thumbnail') || lk.includes('cover') || lv.includes('.jpg') || lv.includes('.png') || lv.includes('.webp') || lv.includes('.heic') || lv.includes('/image/'); },
    looksLikeReactVideo(val) { const l = val.toLowerCase(); return (l.includes('licdn.com') && (l.includes('video') || l.includes('playlist') || l.includes('playback'))) || l.includes('.mp4'); },
    extractPriorityReactUrl(val) { if (val && typeof val.streamingUrl === 'string') { let s = '#video.mp4'; if (val.height) s = `#_q=${val.height}p_video.mp4`; return val.streamingUrl + s; } if (val && typeof val.progressiveUrl === 'string') { let s = '#video.mp4'; if (val.height) s = `#_q=${val.height}p_video.mp4`; return val.progressiveUrl + s; } return null; },
    isValidVideo(url) { if (!url || typeof url !== 'string' || !url.startsWith('http')) return false; if (url.includes('stream_type=dash') || url.includes('.mpd')) return false; const l = url.toLowerCase(); return !(l.includes('//www.linkedin.com') || l.includes('//linkedin.com')); },
    extractVideoUrlFromDOM(el) { if (el.tagName === 'VIDEO') { const sd = el.getAttribute('data-sources'); if (sd) { try { const ss = JSON.parse(sd); if (Array.isArray(ss)) { let best = null; let bb = -1; for (const s of ss) { if (s && s.src && typeof s.src === 'string' && this.isValidVideo(s.src)) { if (!s.src.includes('.mp4') || s.src.includes('manifest')) continue; if (s.type && (s.type.includes('mpegurl') || s.type.includes('dash'))) continue; const br = parseInt(s['data-bitrate'] || '0', 10); if (br > bb) { bb = br; best = s.src; } } } if (best) return best + '#_q=progressive_video.mp4'; } } catch (e) {} } } return null; }
};
