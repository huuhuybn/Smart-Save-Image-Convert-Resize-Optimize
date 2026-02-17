# 🖱️ Right-Click Save

The fastest way to save any image in your preferred format.

---

## How to Use

1. **Right-click** on any image on a webpage
2. Hover over **"Save Image As"** in the context menu
3. Choose your action:

### Format Conversion

| Menu Item | Description |
|-----------|------------|
| **Save as PNG** | Lossless quality, larger file. Best for graphics, logos, screenshots |
| **Save as JPG** | Compressed, smaller file. Best for photos |
| **Save as WebP** | Modern format, best compression. 25-35% smaller than JPG |

### Quick Resize

| Menu Item | Description |
|-----------|------------|
| **PNG (Resize 1080px)** | Converts to PNG, resized to 1080px width |
| **JPG (Resize 720px)** | Converts to JPG, resized to 720px width |
| **Custom Resize...** | Opens resize dialog for custom dimensions |

### Social Media Presets

| Menu Item | Size | Use Case |
|-----------|------|----------|
| **Instagram Post** | 1080 × 1080 | Square feed posts |
| **Instagram Story** | 1080 × 1920 | Stories & Reels covers |
| **TikTok 9:16** | 1080 × 1920 | Video thumbnails |
| **YouTube Thumbnail** | 1280 × 720 | Video thumbnails |

---

## How It Works (Behind the Scenes)

1. Extension fetches the image data
2. Draws it onto an HTML5 Canvas
3. Exports as your chosen format with quality settings
4. Saves to your Downloads folder
5. Shows a notification with file size info

> 🔒 **All processing happens locally on your device.** No image data is ever sent to any server.

---

## Tips

- **WebP is usually the best choice** — it offers the best quality-to-size ratio
- **PNG for transparency** — if you need a transparent background, use PNG
- **JPG for photos** — natural photographs compress best as JPG
- You can change the default quality in [Settings](Settings)

---

### 🐛 Image not saving?

Check the [FAQ](FAQ) or [report a bug](https://github.com/huuhuybn/Smart-Save-Image-Convert-Resize-Optimize/issues/new?template=bug_report.md&labels=bug).
