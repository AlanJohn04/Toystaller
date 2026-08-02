// extensions/global/content.js
// Toystaller Global — multi-platform content script entry point.
// Routes to the correct platform based on hostname and sets up the active platform.

(function() {
    const host = window.location.hostname.toLowerCase();

    // Determine which platform to activate
    function resolveActivePlatform() {
        const platforms = window.ToystallerPlatforms;
        if (!platforms) return null;
        if (host.includes('instagram.com')) return platforms['instagram'];
        if (host.includes('linkedin.com')) return platforms['linkedin'];
        if (host.includes('facebook.com')) return platforms['facebook'];
        if (host.includes('whatsapp.com')) return platforms['whatsapp'];
        return null;
    }

    const platform = resolveActivePlatform();
    if (platform) {
        // Set the active platform for content_core.js
        window.ToystallerActivePlatform = platform;
    }

    // Determine which platform scripts to inject into the MAIN world
    const platformScripts = [
        'platforms/instagram.js',
        'platforms/linkedin.js',
        'platforms/facebook.js',
        'platforms/whatsapp.js',
        'core/interceptor_core.js'
    ];

    // The global interceptor needs a routing getPlatform() — set up the MAIN-world router
    // by injecting a router script that sets window.ToystallerPlatform based on hostname
    const routerCode = `
        (function() {
            const host = window.location.hostname.toLowerCase();
            const platforms = window.ToystallerPlatforms || {};
            if (host.includes('instagram.com')) window.ToystallerPlatform = platforms['instagram'];
            else if (host.includes('linkedin.com')) window.ToystallerPlatform = platforms['linkedin'];
            else if (host.includes('facebook.com')) window.ToystallerPlatform = platforms['facebook'];
            else if (host.includes('whatsapp.com')) window.ToystallerPlatform = platforms['whatsapp'];
        })();
    `;

    // Boot with platform scripts, then inject the router before interceptor
    bootToystaller(platformScripts, routerCode);
})();
