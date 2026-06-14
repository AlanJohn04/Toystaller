# Toystaller - Version 1 (Instagram Focused)

Toystaller is a lightweight and powerful browser extension designed to extract high-quality media URLs and provide sleek overlay options directly on top of videos and images. Version 1 is primarily focused on optimizing the Instagram media-downloading workflow.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](#)
[![100% Local Security](https://img.shields.io/badge/Security-100%25%20Local-success?style=for-the-badge&logo=shield-halved&logoColor=white)](#)

---

## 🚀 Key Features of Version 1

- **Instagram Focused**: Tailored specifically to extract pristine, direct `.mp4` and image URLs from Instagram.
- **Multi-Location Options**: Automatically detects and overlays action buttons on media across various Instagram sections:
  - **Feed Posts**: Shows buttons on standard image and video posts.
  - **Instagram Stories**: Injects options so you can download or view story clips.
  - **Reels**: Resolves background URLs on the scrollable Reels tab.
  - **User Profiles & Grid Views**: Handles hover effects on grid thumbnails.
  - **Explore Page**: Activates overlays when previewing videos and images.
- **React Fiber Interception**: Directly reads React internal props (`__reactFiber$`) in the page context to locate the source video URL, bypassing DASH/segmented buffering limitations.
- **Unified Actions**: Hovering over media reveals options to:
  - **Open in New Tab (↗)**: Redirects directly to the source media URL.
  - **Download Media (⬇)**: Uses the browser downloads API to bypass cross-origin restrictions and save files locally.

---

## 🔒 Security & Privacy

- **100% Local Execution**: All extraction, request sniffing, and React properties parsing happen completely inside your local browser sandbox.
- **Zero Tracking**: The extension does not collect telemetry, track history, or send any data to external servers.
- **No Dependencies**: Built entirely with vanilla HTML/CSS/JS for lightweight, secure operation.

---

## ⚙️ Installation

1. Clone or download this repository.
2. Navigate to your browser's extension manager (e.g., `chrome://extensions/` or `edge://extensions/`).
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** and select this `Version 1` folder.

---

## ⚖️ Disclaimer & License

**For Educational Purposes Only.**
We do not take any responsibility for illegal activities or policy violations. This extension is designed solely for educational analysis and local media viewing. Users are fully responsible for ensuring compliance with the terms of service of any third-party websites they interact with.
