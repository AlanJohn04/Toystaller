# Toystaller

Toystaller is a browser extension that allows you to download and open high-quality images and videos from various social media platforms.

## Version 6 Architecture

Toystaller is now split into 5 modular extensions for easier development and testing:

1. **Toystaller for Instagram:** `extensions/instagram/`
2. **Toystaller for LinkedIn:** `extensions/linkedin/`
3. **Toystaller for Facebook:** `extensions/facebook/`
4. **Toystaller for WhatsApp:** `extensions/whatsapp/`
5. **Toystaller Global:** `extensions/global/` (Combines all 4 platforms)

## How to Install (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the specific extension folder you want to test (e.g., `extensions/instagram/` or `extensions/global/`).

## Development

- **`core/`**: Contains shared logic used by all platforms (button injection, URL scoring, overlay management).
- **`extensions/*/platform.js`**: Platform-specific configurations (thumbnail detection, modal handling, React Fiber extraction logic).
