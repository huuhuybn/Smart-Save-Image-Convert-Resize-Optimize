// ============================================================
// Smart Save Image – Content Script
// Collects all image URLs on the current page
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getImages') {
        const images = collectImages();
        sendResponse(images);
        return false;
    }
});

function collectImages() {
    const seen = new Set();
    const results = [];

    // Collect <img> elements
    document.querySelectorAll('img').forEach((img) => {
        const src = img.src || img.currentSrc;
        if (src && !seen.has(src) && !src.startsWith('data:')) {
            seen.add(src);
            results.push({
                src: src,
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
                alt: img.alt || '',
            });
        }
    });

    // Collect background images from CSS
    document.querySelectorAll('*').forEach((el) => {
        const style = getComputedStyle(el);
        const bg = style.backgroundImage;
        if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1] && !seen.has(match[1]) && !match[1].startsWith('data:')) {
                seen.add(match[1]);
                results.push({
                    src: match[1],
                    width: 0,
                    height: 0,
                    alt: '',
                });
            }
        }
    });

    // Collect <picture> <source> elements
    document.querySelectorAll('picture source').forEach((source) => {
        const srcset = source.srcset;
        if (srcset) {
            srcset.split(',').forEach((entry) => {
                const url = entry.trim().split(/\s+/)[0];
                if (url && !seen.has(url) && !url.startsWith('data:')) {
                    seen.add(url);
                    results.push({ src: url, width: 0, height: 0, alt: '' });
                }
            });
        }
    });

    return results;
}
