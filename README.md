# Toystaller - Version 3 (Smart Dashboard & Shadow DOM UI)

Toystaller is a lightweight, secure browser extension that extracts high-quality media URLs and adds hover action buttons to videos and images across the web.

**Looking for previous releases?** 
- [Version 2 (Smart Placement & LinkedIn Support)](https://github.com/SudiptaSanki/Toystaller/tree/v2)
- [Version 1 (Classic Instagram Layout)](https://github.com/SudiptaSanki/Toystaller/tree/v1)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](#)
[![100% Local Security](https://img.shields.io/badge/Security-100%25%20Local-success?style=for-the-badge&logo=shield-halved&logoColor=white)](#)

---

## 🚀 What's New in Version 3

Version 3 introduces a major architectural shift to give users granular control over when and where Toystaller runs, ensuring zero interface clashes on generic websites.

| Feature | Description |
|---------------|-----------|
| **Smart Dormant Mode** | Toystaller now stays completely inactive by default on most sites to prevent its overlays from interfering with native layouts. |
| **Zero-Config Socials** | Extension remains **Always Active** by default on `instagram.com` and `linkedin.com`. |
| **Injected UI Dashboard** | Clicking the extension icon injects a premium, glassmorphic UI overlay directly onto the webpage, built using a **Shadow DOM** so it never clashes with the host website's CSS. |
| **Site Allowlisting** | Use the dashboard to toggle Toystaller ON for any specific website. Your preferences are saved locally. |
| **Global Override** | A master switch is available for power users to force Toystaller to run everywhere. |

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
