// ============================================================
// Smart Save Image – Custom Resize Window Logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get('imageUrl');

    if (!imageUrl) {
        document.getElementById('info-text').textContent = '❌ No image URL provided';
        return;
    }

    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const maintainRatio = document.getElementById('maintain-ratio');
    const linkIcon = document.getElementById('link-icon');
    const formatSelect = document.getElementById('resize-format');
    const saveBtn = document.getElementById('btn-save');
    const infoText = document.getElementById('info-text');

    let originalWidth = 0;
    let originalHeight = 0;
    let aspectRatio = 1;

    // Load image to get original dimensions
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        originalWidth = img.naturalWidth;
        originalHeight = img.naturalHeight;
        aspectRatio = originalWidth / originalHeight;
        infoText.textContent = `Original: ${originalWidth} × ${originalHeight} px`;
        widthInput.value = originalWidth;
        heightInput.value = originalHeight;
        heightInput.placeholder = originalHeight;
    };
    img.onerror = () => {
        infoText.textContent = '⚠️ Could not load image preview';
    };
    img.src = imageUrl;

    // Maintain ratio toggle
    maintainRatio.addEventListener('change', () => {
        if (maintainRatio.checked) {
            linkIcon.classList.remove('unlocked');
            // Recalculate height from current width
            if (aspectRatio && widthInput.value) {
                heightInput.value = Math.round(parseInt(widthInput.value) / aspectRatio);
            }
            heightInput.disabled = true;
        } else {
            linkIcon.classList.add('unlocked');
            heightInput.disabled = false;
        }
    });

    // Initially lock height
    heightInput.disabled = true;

    // Width change → auto-calc height
    widthInput.addEventListener('input', () => {
        if (maintainRatio.checked && aspectRatio) {
            const w = parseInt(widthInput.value) || 0;
            heightInput.value = Math.round(w / aspectRatio);
        }
    });

    // Link icon click
    linkIcon.addEventListener('click', () => {
        maintainRatio.checked = !maintainRatio.checked;
        maintainRatio.dispatchEvent(new Event('change'));
    });

    // Save button
    saveBtn.addEventListener('click', async () => {
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value) || null;
        const format = formatSelect.value;

        if (!width || width < 1) {
            widthInput.focus();
            widthInput.style.borderColor = '#f85149';
            setTimeout(() => { widthInput.style.borderColor = ''; }, 1500);
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> Processing...';

        try {
            // Get quality from settings
            const settings = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'getSettings' }, (s) => resolve(s));
            });

            const instructions = {
                format: format,
                quality: (format === 'png') ? undefined : (settings.defaultQuality / 100),
                width: width,
                height: maintainRatio.checked ? null : height,
            };

            chrome.runtime.sendMessage({
                action: 'processAndSave',
                imageUrl: imageUrl,
                instructions: instructions,
            }, (result) => {
                if (result && result.error) {
                    saveBtn.innerHTML = '<span>❌</span> ' + result.error;
                } else {
                    saveBtn.innerHTML = '<span>✅</span> Saved!';
                    setTimeout(() => window.close(), 1200);
                }
            });
        } catch (err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span>💾</span> Save Image';
        }
    });
});
