# ❓ Frequently Asked Questions (FAQ)

---

## General

### Is Smart Save Image really free?

**Yes, 100% free.** No paid features, no subscription, no ads, no account required. If you'd like to support development, consider [donating](Home#-donate) ☕

### Does it work on all websites?

It works on most websites. Some sites with very strict security (CORS policies) may block image access. In those cases, try the right-click method instead of batch save.

### What image formats are supported?

| Input | Output |
|-------|--------|
| Any web image (PNG, JPG, GIF, WebP, SVG, BMP) | PNG, JPG, WebP |

### Does it work with animated GIFs?

Currently, animated GIFs are saved as a static frame. Full GIF support may be added in a future update — [vote for this feature](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize/discussions).

---

## Privacy & Security

### Is my data safe?

**Absolutely.** All image processing happens **locally in your browser** using the Canvas API. No images are ever uploaded to any server. Zero network requests for processing.

### Why does it need "Read and change all your data" permission?

This permission is required to access and download images from any webpage. We never read, store, or modify any of your personal data. The extension's source code is [open on GitHub](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize) for full transparency.

---

## Troubleshooting

### The right-click menu doesn't appear

1. Make sure the extension is enabled at `chrome://extensions/`
2. Try refreshing the page (Ctrl+R / Cmd+R)
3. Make sure you're right-clicking directly on an image, not a video or background

### Images are saving with low quality

Go to **Settings** → increase **Default Quality** to **High (0.92)** or **Maximum (1.0)**.

### Batch save shows "0 images found"

1. Scroll down the page to load all images (many sites use lazy loading)
2. Click **🔄 Rescan** in the popup
3. Wait a few seconds for dynamic content to load

### The extension isn't working on Chrome internal pages

Chrome extensions cannot run on internal pages like `chrome://`, `chrome-extension://`, or the Chrome Web Store. This is a Chrome security restriction.

### Download doesn't start

1. Check if Chrome is blocking multiple downloads: look for a notification bar at the bottom of Chrome
2. Allow the downloads when prompted
3. Check your Downloads folder — the file may have been saved already

---

## Still Need Help?

| Action | Link |
|--------|------|
| 🐛 **Report a Bug** | [Create Issue →](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize/issues/new?template=bug_report.md&labels=bug) |
| 💡 **Feature Request** | [Suggest Feature →](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize/issues/new?template=feature_request.md&labels=enhancement) |
| 💬 **Discussion** | [Join Discussion →](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize/discussions) |
| ☕ **Donate** | [Support Development →](Home#-donate) |

---

<p align="center">
  <strong>💖 If Smart Save Image has been helpful, please consider:</strong><br><br>
  ⭐ <a href="https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize">Starring the repo</a> &nbsp;•&nbsp;
  📝 <a href="https://chromewebstore.google.com/detail/smart-save-image/YOUR_EXTENSION_ID">Reviewing on Chrome Web Store</a> &nbsp;•&nbsp;
  ☕ <a href="Home#-donate">Donating</a>
</p>
