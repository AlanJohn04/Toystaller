# Toystaller - Version 5 (Platform-Aware Architecture & Facebook Support)

Toystaller is a lightweight, secure browser extension that extracts high-quality media URLs and adds hover action buttons to videos and images across the web.

**Looking for previous releases?** 
- [Version 4 (Page-Aware Media Extraction & DM Support)](https://github.com/SudiptaSanki/Toystaller/tree/v4)
- [Version 3 (Smart Dashboard & Shadow DOM UI)](https://github.com/SudiptaSanki/Toystaller/tree/v3)
- [Version 2 (Smart Placement & LinkedIn Support)](https://github.com/SudiptaSanki/Toystaller/tree/v2)
- [Version 1 (Classic Instagram Layout)](https://github.com/SudiptaSanki/Toystaller/tree/v1)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![Version 5](https://img.shields.io/badge/Version-V5-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](#)
[![100% Local Security](https://img.shields.io/badge/Security-100%25%20Local-success?style=for-the-badge&logo=shield-halved&logoColor=white)](#)

---

## 🚀 What's New in Version 5

Version 5 introduces the **Platform Abstraction Layer**, allowing Toystaller to understand the specific UI layout and page context of major social networks.

| Feature | Description |
|---------------|-----------|
| **Facebook Support** | Full support for downloading progressive MP4s from Facebook Reels, Watch, and Feed pages. Accurately filters out Facebook avatars, sponsored icons, and chat heads. |
| **Dual Button Mode** | Videos now display two buttons: the classic Blue button to open the high-quality video in a new tab, and a Red button to instantly download the video's cover/thumbnail image. |
| **High-Res Upgrading** | Added a powerful `srcset` parser and URL upgrading logic. When downloading images on LinkedIn, Toystaller now forces the server to return the highest possible resolution instead of the compressed feed thumbnail. |
| **LinkedIn Modals Fixed** | Fixed a critical bug where LinkedIn's messaging tab was mistakenly treated as a full-screen modal, blocking feed videos. Modals are now tracked using LinkedIn's native `.artdeco-modal` classes. |
| **DM Chat Layout Fixes** | Stricter dimensional checks and UI-ancestor exclusion in Instagram DMs prevent buttons from flashing on profile pictures and read receipts. |

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
