/**
 * Reliable file download utility for Memoria Studio.
 * 
 * Uses the File System Access API (showSaveFilePicker) as the primary method,
 * which opens a native "Save As" dialog letting the user choose filename and folder.
 * Falls back to anchor-based download for older browsers.
 */

/**
 * Download a canvas as a JPEG image with a proper filename.
 * Opens a native "Save As" dialog so the user can pick the location.
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element to export
 * @param {string} filename - Suggested filename (e.g. "harry_customized.jpg")
 */
export async function downloadCanvasAsJpeg(canvas, filename) {
  // Convert canvas to blob using the async toBlob API
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      1.0
    );
  });

  await downloadBlob(blob, filename, {
    description: 'JPEG Image',
    accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
  });
}

/**
 * Download a Blob (video, image, or any file) with a proper filename.
 * Opens a native "Save As" dialog so the user can pick the location.
 * 
 * @param {Blob} blob - The blob data to save
 * @param {string} filename - Suggested filename
 * @param {object} [fileType] - File type filter for the save dialog
 * @param {string} fileType.description - Human-readable type description
 * @param {object} fileType.accept - MIME to extension mapping, e.g. { 'image/jpeg': ['.jpg'] }
 */
export async function downloadBlob(blob, filename, fileType) {
  // Primary: File System Access API (Chrome 86+, Edge 86+)
  // This opens a real "Save As" dialog - user picks folder and filename
  if (window.showSaveFilePicker) {
    try {
      const options = {
        suggestedName: filename,
      };
      if (fileType) {
        options.types = [fileType];
      }

      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Success!
    } catch (err) {
      // User cancelled the dialog — that's fine, just return
      if (err.name === 'AbortError') return;
      // Any other error — fall through to fallback
      console.warn('showSaveFilePicker failed, using fallback:', err.message);
    }
  }

  // Fallback: anchor download with blob URL
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Generate a safe filename from a template title.
 * Strips special characters and replaces spaces with underscores.
 * 
 * @param {string} title - Raw template title
 * @param {string} suffix - Suffix before extension (e.g. "_customized")
 * @param {string} ext - File extension (e.g. "jpg")
 * @returns {string} Safe filename
 */
export function makeSafeFilename(title, suffix = '_customized', ext = 'jpg') {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${safe || 'template'}${suffix}.${ext}`;
}
