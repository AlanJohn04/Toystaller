// overlay_manager.js
// Handles tracking media elements and positioning buttons over them safely
// by appending to document.body. This avoids complex z-index and overlay
// issues on sites like Instagram.

class OverlayManager {
    constructor() {
        this.overlays = new Map(); // media element -> overlay container
        
        // Update positions on scroll and resize
        window.addEventListener('scroll', () => this.updateAllPositions(), true);
        window.addEventListener('resize', () => this.updateAllPositions());
        
        // Periodically check for removed media or position changes
        setInterval(() => this.updateAllPositions(), 1000);
    }

    addOverlay(media, createButtonsFn) {
        if (this.overlays.has(media)) return;

        const container = document.createElement('div');
        container.className = 'magic-dl-overlay';
        container.style.cssText = `
            position: fixed;
            z-index: 2147483647;
            display: flex;
            gap: 6px;
            pointer-events: none;
            transition: opacity 0.2s;
        `;

        // Add buttons
        const buttons = createButtonsFn();
        buttons.forEach(btn => container.appendChild(btn));

        document.body.appendChild(container);
        this.overlays.set(media, container);

        this.updatePosition(media, container);
    }

    updatePosition(media, container) {
        if (!media.isConnected) {
            // Media element was removed from the DOM
            container.remove();
            this.overlays.delete(media);
            return;
        }

        const rect = media.getBoundingClientRect();
        
        // Hide if media is out of viewport or hidden
        if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        // Position at top-right of the media element (with 10px padding)
        container.style.top = `${rect.top + 10}px`;
        container.style.left = `${rect.right - container.offsetWidth - 10}px`;
    }

    updateAllPositions() {
        for (const [media, container] of this.overlays.entries()) {
            this.updatePosition(media, container);
        }
    }
}

window.magicOverlayManager = new OverlayManager();
