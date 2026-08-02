// extensions/instagram/content.js
// Instagram-specific content script entry point.
// Boots Toystaller with Instagram platform config and interceptor scripts.

// Boot immediately — manifest restricts this to instagram.com only
bootToystaller([
    'platform.js',              // Sets window.ToystallerPlatform in MAIN world
    'core/interceptor_core.js'  // Patches fetch/XHR and React Fiber extraction
]);
