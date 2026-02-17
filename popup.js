// ============================================================
// Smart Save Image – Popup Logic
// Handles tab switching, URL convert, batch save, settings
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUrlConvert();
    initBatchActions();
    initSettings();
    scanPageImages();
});

// ---------- Tab Navigation ----------
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

// ---------- Scan Page Images ----------
function scanPageImages() {
    const badge = document.getElementById('image-count');
    badge.textContent = 'Scanning...';

    chrome.runtime.sendMessage({ action: 'collectImages' }, (images) => {
        const count = images ? images.length : 0;
        badge.textContent = `${count} image${count !== 1 ? 's' : ''} found`;
        window._pageImages = images || [];
    });

    document.getElementById('btn-scan').addEventListener('click', () => {
        scanPageImages();
    });
}

// ---------- Convert from URL ----------
function initUrlConvert() {
    const btn = document.getElementById('btn-convert-url');
    const input = document.getElementById('image-url-input');
    const formatSelect = document.getElementById('url-format-select');

    btn.addEventListener('click', async () => {
        const url = input.value.trim();
        if (!url) {
            input.focus();
            input.style.borderColor = '#f85149';
            setTimeout(() => { input.style.borderColor = ''; }, 1500);
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';

        try {
            const settings = await getSettings();
            const instructions = {
                format: formatSelect.value,
                quality: settings.defaultQuality / 100,
            };

            chrome.runtime.sendMessage({
                action: 'processAndSave',
                imageUrl: url,
                instructions: instructions,
            }, (result) => {
                btn.disabled = false;
                btn.innerHTML = '<span class="btn-icon">📥</span> Convert & Save';
                if (result && result.error) {
                    showToast('❌ ' + result.error);
                } else {
                    showToast('✅ Saved successfully!');
                    input.value = '';
                }
            });
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">📥</span> Convert & Save';
            showToast('❌ ' + err.message);
        }
    });

    // Enter key support
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btn.click();
    });
}

// ---------- Batch Actions ----------
function initBatchActions() {
    const batchBtns = document.querySelectorAll('.btn-batch');
    batchBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const batchType = btn.dataset.batch;
            startBatch(batchType);
        });
    });
}

async function startBatch(batchType) {
    const images = window._pageImages || [];
    if (images.length === 0) {
        showToast('❌ No images found on page');
        return;
    }

    const progressEl = document.getElementById('batch-progress');
    const progressText = document.getElementById('progress-text');
    const progressCount = document.getElementById('progress-count');
    const progressFill = document.getElementById('progress-fill');

    progressEl.style.display = 'block';
    progressText.textContent = 'Processing...';
    progressFill.style.width = '0%';

    const settings = await getSettings();
    let instructions;

    switch (batchType) {
        case 'webp':
            instructions = { format: 'webp', quality: settings.defaultQuality / 100 };
            break;
        case 'png':
            instructions = { format: 'png' };
            break;
        case 'resize-1080':
            instructions = { format: 'jpeg', quality: settings.defaultQuality / 100, resizeWidth: 1080 };
            break;
        case 'instagram':
            instructions = { format: 'jpeg', quality: settings.defaultQuality / 100, cropWidth: 1080, cropHeight: 1080 };
            break;
        case 'youtube':
            instructions = { format: 'jpeg', quality: settings.defaultQuality / 100, cropWidth: 1280, cropHeight: 720 };
            break;
        case 'zip':
            instructions = { format: 'webp', quality: settings.defaultQuality / 100, asZip: true };
            break;
        default:
            return;
    }

    const isZip = batchType === 'zip';
    let zipBlobs = [];

    for (let i = 0; i < images.length; i++) {
        const pct = Math.round(((i + 1) / images.length) * 100);
        progressCount.textContent = `${i + 1}/${images.length}`;
        progressFill.style.width = `${pct}%`;
        progressText.textContent = isZip ? 'Preparing ZIP...' : `Saving image ${i + 1}...`;

        try {
            if (isZip) {
                // Collect processed results for ZIP
                const result = await processImageAsync(images[i].src, instructions);
                if (result && !result.error) {
                    zipBlobs.push({
                        name: getFilenameFromUrl(images[i].src, instructions),
                        dataUrl: result.dataUrl,
                    });
                }
            } else {
                // Save individually
                await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'processAndSave',
                        imageUrl: images[i].src,
                        instructions: { ...instructions },
                    }, () => resolve());
                });
            }
        } catch (e) {
            console.warn(`Failed to process image ${i}:`, e);
        }

        // Small delay to avoid overwhelming
        await sleep(100);
    }

    if (isZip && zipBlobs.length > 0) {
        progressText.textContent = 'Creating ZIP file...';
        await createAndDownloadZip(zipBlobs);
    }

    progressText.textContent = '✅ Done!';
    progressFill.style.width = '100%';
    progressFill.style.background = 'var(--gradient-success)';
    setTimeout(() => {
        progressEl.style.display = 'none';
        progressFill.style.background = '';
    }, 2500);
}

function processImageAsync(imageUrl, instructions) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: 'processAndReturnBlob',
            imageUrl,
            instructions,
        }, (result) => resolve(result));
    });
}

async function createAndDownloadZip(files) {
    if (typeof JSZip === 'undefined') {
        showToast('❌ ZIP library not loaded');
        return;
    }

    const zip = new JSZip();
    for (const file of files) {
        const base64 = file.dataUrl.split(',')[1];
        zip.file(file.name, base64, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);

    chrome.runtime.sendMessage({
        action: 'downloadBlob',
        dataUrl: url,
        filename: `smart-save-images-${Date.now()}.zip`,
    });
}

function getFilenameFromUrl(url, instructions) {
    let base = url.split('/').pop().split('?')[0].split('#')[0];
    base = base.replace(/\.[^.]+$/, '') || 'image';
    base = base.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const ext = instructions.format === 'jpeg' ? 'jpg' : (instructions.format || 'png');
    return `${base}.${ext}`;
}

// ---------- Settings ----------
function initSettings() {
    const qualityRange = document.getElementById('setting-quality');
    const qualityValue = document.getElementById('quality-value');
    const resizeBehavior = document.getElementById('setting-resize-behavior');
    const showSummary = document.getElementById('setting-show-summary');
    const socialPresets = document.getElementById('setting-social-presets');

    // Load saved settings
    getSettings().then((settings) => {
        qualityRange.value = settings.defaultQuality;
        qualityValue.textContent = settings.defaultQuality + '%';
        resizeBehavior.value = settings.resizeBehavior;
        showSummary.checked = settings.showOptimizationSummary;
        socialPresets.checked = settings.enableSocialPresets;
    });

    // Quality slider live update
    qualityRange.addEventListener('input', () => {
        qualityValue.textContent = qualityRange.value + '%';
    });

    // Save on any change
    const saveSettings = () => {
        const newSettings = {
            defaultQuality: parseInt(qualityRange.value),
            resizeBehavior: resizeBehavior.value,
            showOptimizationSummary: showSummary.checked,
            enableSocialPresets: socialPresets.checked,
        };
        chrome.storage.sync.set({ settings: newSettings });
    };

    qualityRange.addEventListener('change', saveSettings);
    resizeBehavior.addEventListener('change', saveSettings);
    showSummary.addEventListener('change', saveSettings);
    socialPresets.addEventListener('change', saveSettings);
}

// ---------- Helpers ----------
function getSettings() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
            resolve(settings || {
                defaultQuality: 85,
                resizeBehavior: 'crop',
                showOptimizationSummary: true,
                enableSocialPresets: true,
            });
        });
    });
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(22, 27, 34, 0.95);
      border: 1px solid rgba(88, 166, 255, 0.3);
      border-radius: 8px;
      font-size: 12px;
      color: #f0f6fc;
      z-index: 9999;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease;
    `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}
