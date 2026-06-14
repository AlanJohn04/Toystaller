# Toystaller - Version 2 (Smart Placement & LinkedIn Support)

Toystaller is a lightweight, secure browser extension that extracts high-quality media URLs and adds hover action buttons to videos and images across the web.

**Looking for the original release?** You can access and load the Instagram-focused [Version 1](https://github.com/SudiptaSanki/Toystaller/tree/v1) if you prefer the classic layout.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](#)
[![100% Local Security](https://img.shields.io/badge/Security-100%25%20Local-success?style=for-the-badge&logo=shield-halved&logoColor=white)](#)

---

## 🚀 What's New in Version 2

Version 2 upgrades the extension with advanced features, better image targeting, raw tab filters, and robust platform-aware overrides to prevent clashing with native website controls.

| Problem in v1 | Fix in v2 |
|---------------|-----------|
| **Button Clashes** (e.g. overlapped close, share, volume controls) | **Platform-Aware Placement**: Automatically maps sites to safe corners. On **Instagram** and **LinkedIn**, buttons default to the **top-left** corner on media elements to stay clear of native UI. |
| **Raw Tab Duplication** | **Raw Media Filter**: The content script ignores tabs containing direct video or image files, preventing redundant overlays from rendering on top of a media tab. |
| **Grid Image Filtering** | **Improved Image Targeting**: Images inside buttons, links, or galleries are no longer skipped if they possess a large source resolution (`naturalWidth >= 200`). |
| **LinkedIn Video Extraction** | **LinkedIn Support**: Extends network request interception and React Fiber traversal to retrieve progressive `.mp4` URLs from LinkedIn's CDNs. |
| **Position & Tracking** | **ResizeObserver**: Tracks media scale updates dynamically, keeping overlays tight during page layout changes. |

---

## 🔒 Security & Privacy

- **100% Local Processing**: All code runs entirely in your local browser sandbox. No user tracking, no third-party APIs, and no external analytics.
- **Privacy First**: Sniffed media URLs and React state properties never leave your device.

---

## ⚙️ Installation

1. Clone or download this repository.
2. Open your browser extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the cloned repository folder.

---

## ⚖️ Disclaimer & License

**For Educational Purposes Only.**
We do not take any responsibility for illegal activities or policy violations. This extension is designed solely for educational analysis and local media viewing. Users are fully responsible for ensuring compliance with the terms of service of any third-party websites they interact with.
