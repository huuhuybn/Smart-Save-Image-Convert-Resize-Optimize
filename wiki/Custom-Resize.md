# 📐 Custom Resize

Resize any image to exact dimensions before saving.

---

## How to Open

**Method 1 — Context Menu:**
1. Right-click an image
2. Go to **"Save Image As"** → **"Custom Resize..."**

---

## Resize Options

### Dimensions

| Field | Description |
|-------|-------------|
| **Width (px)** | Target width in pixels |
| **Height (px)** | Target height in pixels |
| **🔗 Maintain Aspect Ratio** | When enabled, changing one dimension auto-calculates the other |

### Output Format

Choose from:
- **PNG** — Lossless, supports transparency
- **JPG** — Compressed, smaller file size
- **WebP** — Best compression ratio

### Resize Behavior

Controlled in [Settings](Settings):

| Mode | Description |
|------|-------------|
| **Center Crop** | Fills the exact dimensions, cropping edges if needed |
| **Fit (Letterbox)** | Fits entire image within dimensions, adding padding if needed |

---

## Example Use Cases

| Scenario | Suggested Settings |
|----------|-------------------|
| Profile picture | 400 × 400, Center Crop, JPG |
| Blog header | 1200 × 630, Fit, WebP |
| Product photo | 800 × 800, Center Crop, PNG |
| Email banner | 600 × 200, Fit, JPG |

---

## Tips

- 💡 **Aspect ratio lock** prevents distortion — keep it enabled unless you intentionally want to stretch
- 💡 **Upscaling** is supported but may reduce quality — best to resize down, not up
- 💡 For social media sizes, use the built-in [Social Media Presets](Social-Media-Presets) instead

---

### 💖 Found this useful? Please consider [donating](Home#-donate) to support development!
