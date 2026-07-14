import { uploadFileToStorage } from './s3Service.js';
import fs from 'fs';
import path from 'path';

/**
 * Uploads a preset asset using the abstracted storage provider/service.
 * This service currently delegates to the AWS S3/Local fallback storage,
 * and can be easily configured or switched to Cloudinary, Azure Blob, or another 
 * provider without affecting the preset controllers or editor.
 * 
 * @param {Object} file - The multer file object
 * @returns {Promise<string>} The public URL of the uploaded asset
 */
export const uploadPresetAsset = async (file) => {
  if (!file) return '';
  
  // Delegates to our standard storage helper which dynamically handles S3 vs Local fallback
  return await uploadFileToStorage(file);
};

/**
 * Removes a preset asset from the active storage provider.
 * If the URL corresponds to a local file, it removes it from the local disk.
 * 
 * @param {string} fileUrl - The public URL of the asset to delete
 */
export const deletePresetAsset = async (fileUrl) => {
  if (!fileUrl) return;

  // Local storage clean-up
  if (fileUrl.includes('/uploads/')) {
    try {
      const filename = fileUrl.split('/uploads/')[1];
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Storage Service] Deleted local preset asset: ${filename}`);
      }
    } catch (err) {
      console.error(`[Storage Service] Failed to delete local preset file: ${err.message}`);
    }
  }
  
  // Future S3 / Cloudinary deletion logic can be hooked directly here:
  // e.g., if (fileUrl.includes('amazonaws.com')) { ... s3Client.send(new DeleteObjectCommand(...)) ... }
};
