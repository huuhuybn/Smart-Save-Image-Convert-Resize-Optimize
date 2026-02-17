// ============================================================
// Smart Save Image – Background Service Worker
// Handles context menus, image fetching, message routing, downloads, notifications
// ============================================================

// ---------- Constants ----------
const MENU_ITEMS = [
  { id: 'save-png', title: 'Save as PNG' },
  { id: 'save-jpg', title: 'Save as JPG' },
  { id: 'save-webp', title: 'Save as WebP' },
  { id: 'sep-1', type: 'separator' },
  { id: 'save-png-1080', title: 'PNG (Resize 1080px)' },
  { id: 'save-jpg-720', title: 'JPG (Resize 720px)' },
  { id: 'save-custom-resize', title: 'Custom Resize...' },
  { id: 'sep-2', type: 'separator' },
  { id: 'save-instagram-post', title: 'Instagram Post (1080×1080)' },
  { id: 'save-instagram-story', title: 'Instagram Story (1080×1920)' },
  { id: 'save-tiktok', title: 'TikTok 9:16 (1080×1920)' },
  { id: 'save-youtube-thumb', title: 'YouTube Thumbnail (1280×720)' },
];

const PARENT_MENU_ID = 'smart-save-parent';

// Map menu IDs to processing instructions
const MENU_ACTIONS = {
  'save-png': { format: 'png' },
  'save-jpg': { format: 'jpeg', quality: null },
  'save-webp': { format: 'webp', quality: null },
  'save-png-1080': { format: 'png', resizeWidth: 1080 },
  'save-jpg-720': { format: 'jpeg', quality: null, resizeWidth: 720 },
  'save-instagram-post': { format: 'jpeg', quality: null, cropWidth: 1080, cropHeight: 1080 },
  'save-instagram-story': { format: 'jpeg', quality: null, cropWidth: 1080, cropHeight: 1920 },
  'save-tiktok': { format: 'jpeg', quality: null, cropWidth: 1080, cropHeight: 1920 },
  'save-youtube-thumb': { format: 'jpeg', quality: null, cropWidth: 1280, cropHeight: 720 },
};

// ---------- Context Menu Setup ----------
chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu
  chrome.contextMenus.create({
    id: PARENT_MENU_ID,
    title: 'Save Image As',
    contexts: ['image'],
  });

  // Create child items
  MENU_ITEMS.forEach((item) => {
    if (item.type === 'separator') {
      chrome.contextMenus.create({
        id: item.id,
        type: 'separator',
        parentId: PARENT_MENU_ID,
        contexts: ['image'],
      });
    } else {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        parentId: PARENT_MENU_ID,
        contexts: ['image'],
      });
    }
  });

  // Initialize default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          defaultQuality: 85,
          resizeBehavior: 'crop',
          showOptimizationSummary: true,
          enableSocialPresets: true,
        }
      });
    }
  });
});

// ---------- Context Menu Click Handler ----------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const imageUrl = info.srcUrl;
  if (!imageUrl) return;

  const menuId = info.menuItemId;

  // Custom resize opens a separate window
  if (menuId === 'save-custom-resize') {
    openCustomResizeWindow(imageUrl);
    return;
  }

  const action = MENU_ACTIONS[menuId];
  if (!action) return;

  // Get user settings for quality
  const settings = await getSettings();
  const instructions = { ...action };
  if (instructions.quality === null) {
    instructions.quality = settings.defaultQuality / 100;
  }
  if (instructions.cropWidth && settings.resizeBehavior === 'fit') {
    instructions.fitMode = true;
  }

  await processAndSave(imageUrl, instructions, settings);
});

// ---------- Message Handler ----------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processAndSave') {
    processAndSave(message.imageUrl, message.instructions, null)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'processAndReturnBlob') {
    processImage(message.imageUrl, message.instructions)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === 'getSettings') {
    getSettings().then((s) => sendResponse(s));
    return true;
  }

  if (message.action === 'downloadBlob') {
    triggerDownload(message.dataUrl, message.filename);
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'collectImages') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { sendResponse([]); return; }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js'],
      }, () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getImages' }, (images) => {
          sendResponse(images || []);
        });
      });
    });
    return true;
  }

  // Response from offscreen document
  if (message.action === 'offscreen-result') {
    // Handled via pending callbacks
    return false;
  }
});

// ---------- Offscreen Document Management ----------
let offscreenCreating = null;

async function ensureOffscreen() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')],
    });
    if (existingContexts.length > 0) return;
  } catch (e) {
    // getContexts not available, try creating anyway
    console.log('getContexts not available, attempting to create offscreen document');
  }

  if (offscreenCreating) {
    await offscreenCreating;
  } else {
    offscreenCreating = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Image processing with Canvas API for format conversion, resize, and crop',
    }).catch((err) => {
      // Document might already exist
      if (!err.message?.includes('Only a single offscreen')) {
        console.error('Failed to create offscreen document:', err);
        throw err;
      }
    });
    await offscreenCreating;
    offscreenCreating = null;
  }
}

// ---------- Fetch Image in Background (has host_permissions) ----------
async function fetchImageAsDataUrl(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const originalSize = blob.size;

    // Convert to data URL for transfer to offscreen
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });

    return { dataUrl, originalSize };
  } catch (err) {
    console.error('Fetch failed for:', imageUrl, err);
    throw new Error(`Failed to fetch image: ${err.message}`);
  }
}

// ---------- Image Processing via Offscreen ----------
let pendingRequests = new Map();
let requestId = 0;

async function processImage(imageUrl, instructions) {
  // Step 1: Fetch image in background (has host_permissions)
  const { dataUrl: imageDataUrl, originalSize } = await fetchImageAsDataUrl(imageUrl);

  // Step 2: Ensure offscreen document exists
  await ensureOffscreen();

  // Step 3: Send to offscreen for canvas processing
  const id = ++requestId;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Processing timed out'));
    }, 30000);

    pendingRequests.set(id, { resolve, reject, timeout, originalSize });

    chrome.runtime.sendMessage({
      action: 'offscreen-process',
      id: id,
      imageDataUrl: imageDataUrl,
      originalSize: originalSize,
      instructions: instructions,
    });
  });
}

// Listen for responses from offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'offscreen-response' && message.id) {
    const pending = pendingRequests.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve({
          dataUrl: message.dataUrl,
          originalSize: pending.originalSize,
          newSize: message.newSize,
          width: message.width,
          height: message.height,
          format: message.format,
        });
      }
    }
  }
  return false;
});

// ---------- Process and Save ----------
async function processAndSave(imageUrl, instructions, settings) {
  try {
    if (!settings) settings = await getSettings();
    if (instructions.quality === null || instructions.quality === undefined) {
      instructions.quality = settings.defaultQuality / 100;
    }

    const result = await processImage(imageUrl, instructions);

    // Build filename
    const urlParts = imageUrl.split('/');
    let baseName = urlParts[urlParts.length - 1].split('?')[0].split('#')[0];
    baseName = baseName.replace(/\.[^.]+$/, '') || 'image';
    baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

    const extMap = { 'png': 'png', 'jpeg': 'jpeg', 'webp': 'webp' };
    const ext = extMap[instructions.format] || 'png';
    let suffix = '';
    if (instructions.resizeWidth) suffix = `_${instructions.resizeWidth}px`;
    if (instructions.cropWidth) suffix = `_${instructions.cropWidth}x${instructions.cropHeight}`;
    const filename = `${baseName}${suffix}.${ext === 'jpeg' ? 'jpg' : ext}`;

    // Download
    triggerDownload(result.dataUrl, filename);

    // Show notification
    if (settings.showOptimizationSummary) {
      showNotification(filename, result.originalSize, result.newSize, instructions.format);
    }

    return { success: true, filename, ...result };
  } catch (err) {
    console.error('Smart Save Error:', err);
    showErrorNotification(err.message);
    return { error: err.message };
  }
}

// ---------- Download ----------
function triggerDownload(dataUrl, filename) {
  chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false,
  });
}

// ---------- Custom Resize Window ----------
function openCustomResizeWindow(imageUrl) {
  chrome.windows.create({
    url: `resize.html?imageUrl=${encodeURIComponent(imageUrl)}`,
    type: 'popup',
    width: 420,
    height: 380,
    focused: true,
  });
}

// ---------- Notifications ----------
function showNotification(filename, originalSize, newSize, format) {
  const reduction = originalSize > 0
    ? Math.round((1 - newSize / originalSize) * 100)
    : 0;
  const formatLabel = format === 'jpeg' ? 'JPG' : format.toUpperCase();

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `✅ Saved as ${formatLabel}`,
    message: `Original: ${formatSize(originalSize)} → New: ${formatSize(newSize)} (${reduction}% smaller)`,
    priority: 1,
  });
}

function showErrorNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '❌ Save Failed',
    message: message || 'An unknown error occurred.',
    priority: 2,
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ---------- Settings ----------
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      resolve(result.settings || {
        defaultQuality: 85,
        resizeBehavior: 'crop',
        showOptimizationSummary: true,
        enableSocialPresets: true,
      });
    });
  });
}
