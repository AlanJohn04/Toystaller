# Toystaller

Toystaller is a lightweight and powerful browser extension that automatically extracts high-quality media URLs and adds a sleek download button to videos and images across any website.

## Features

- **Universal Support**: Works seamlessly on standard video and image tags across the web.
- **Dynamic Content Handling**: Intelligently handles dynamically loaded media (like on Instagram or Facebook) by intercepting network requests in the background.
- **Robust Downloading**: Uses the native browser downloads API to bypass cross-origin restrictions, allowing you to save files directly to your device without hassle.
- **Clean UI**: Hover over any supported image or video to reveal beautiful, non-intrusive action buttons:
  - Download Media (⬇)
  - Open Media in New Tab (↗)
- **Smart Filtering**: Automatically ignores small icons and UI elements to prevent clutter.

## Installation(Unpacked Extension)

1. Clone or download this repository.
2. Open your browser and navigate to the Extensions management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked** and select the `Toystaller` directory.
5. The extension is now installed and ready to use! Navigate to any site to test it out.

## How it Works

- `content_script.js`: Injects hover buttons on `<video>` and `<img>` elements.
- `background_script.js`: Silently listens for media requests (e.g., `.mp4`, `.jpg`, `.webm`) and manages direct file downloads.
