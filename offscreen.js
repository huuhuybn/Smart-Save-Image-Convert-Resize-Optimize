// ============================================================
// Smart Save Image – Offscreen Image Processing Engine
// Receives image data URL from background, processes via Canvas
// ============================================================

// ---------- Message Handler ----------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'offscreen-process') {
        handleProcess(message)
            .then((result) => {
                chrome.runtime.sendMessage({
                    action: 'offscreen-response',
                    id: message.id,
                    dataUrl: result.dataUrl,
                    newSize: result.newSize,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                });
            })
            .catch((err) => {
                chrome.runtime.sendMessage({
                    action: 'offscreen-response',
                    id: message.id,
                    error: err.message || 'Unknown processing error',
                });
            });
        return false; // Don't use sendResponse, we use sendMessage instead
    }
});

// ---------- Main Processing Pipeline ----------
async function handleProcess(message) {
    const { imageDataUrl, instructions } = message;

    // 1. Load data URL into an Image element
    const img = await loadImage(imageDataUrl);

    // 2. Determine output dimensions
    let outWidth = img.naturalWidth;
    let outHeight = img.naturalHeight;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    // Crop mode (social presets)
    if (instructions.cropWidth && instructions.cropHeight) {
        const targetW = instructions.cropWidth;
        const targetH = instructions.cropHeight;
        const targetRatio = targetW / targetH;
        const imgRatio = img.naturalWidth / img.naturalHeight;

        if (instructions.fitMode) {
            // Fit mode: letterbox
            outWidth = targetW;
            outHeight = targetH;
        } else {
            // Crop center (default)
            if (imgRatio > targetRatio) {
                // Image is wider → crop sides
                sh = img.naturalHeight;
                sw = Math.round(sh * targetRatio);
                sx = Math.round((img.naturalWidth - sw) / 2);
                sy = 0;
            } else {
                // Image is taller → crop top/bottom
                sw = img.naturalWidth;
                sh = Math.round(sw / targetRatio);
                sx = 0;
                sy = Math.round((img.naturalHeight - sh) / 2);
            }
            outWidth = targetW;
            outHeight = targetH;
        }
    }
    // Resize mode (width-based)
    else if (instructions.resizeWidth) {
        outWidth = instructions.resizeWidth;
        outHeight = Math.round(img.naturalHeight * (instructions.resizeWidth / img.naturalWidth));
    }
    // Custom resize with explicit width and height
    else if (instructions.width) {
        outWidth = instructions.width;
        if (instructions.height) {
            outHeight = instructions.height;
        } else {
            outHeight = Math.round(img.naturalHeight * (instructions.width / img.naturalWidth));
        }
    }

    // 3. Draw to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = outWidth;
    canvas.height = outHeight;

    // Clear canvas (important for transparency in PNG)
    ctx.clearRect(0, 0, outWidth, outHeight);

    if (instructions.fitMode && instructions.cropWidth) {
        // Fill with black background for fit mode
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, outWidth, outHeight);
        // Calculate centered position
        const targetRatio = instructions.cropWidth / instructions.cropHeight;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > targetRatio) {
            drawW = outWidth;
            drawH = Math.round(outWidth / imgRatio);
            drawX = 0;
            drawY = Math.round((outHeight - drawH) / 2);
        } else {
            drawH = outHeight;
            drawW = Math.round(outHeight * imgRatio);
            drawX = Math.round((outWidth - drawW) / 2);
            drawY = 0;
        }
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);
    } else if (instructions.cropWidth) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
    } else {
        ctx.drawImage(img, 0, 0, outWidth, outHeight);
    }

    // 4. Convert to target format
    const format = instructions.format || 'png';
    const mimeType = `image/${format}`;
    const quality = (format === 'png') ? undefined : (instructions.quality || 0.85);

    const outputBlob = await canvasToBlob(canvas, mimeType, quality);
    const newSize = outputBlob.size;

    // 5. Convert to data URL for transfer back
    const dataUrl = await blobToDataUrl(outputBlob);

    return {
        dataUrl,
        newSize,
        width: outWidth,
        height: outHeight,
        format,
    };
}

// ---------- Helpers ----------
function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = dataUrl;
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            },
            mimeType,
            quality
        );
    });
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
    });
}
