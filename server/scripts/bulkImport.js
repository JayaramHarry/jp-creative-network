import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';
import Template from '../models/Template.js';
import { uploadFileToStorage } from '../services/s3Service.js';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv from the parent server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const IMPORT_DIR = path.join(__dirname, '../bulk-import-pending');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure standard directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// MIME type helper mapping
const getMimeType = (ext) => {
  const map = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};

// Generate smart defaults for template layout configuration based on category and type
const generateDefaultConfig = (categoryName, type) => {
  const cat = categoryName.toLowerCase();
  
  if (cat.includes('political')) {
    return {
      photoBox: { x: 40, y: 320, width: 170, height: 230 },
      texts: [
        { id: 'name', label: 'Leader Name', x: 230, y: 370, fontSize: 28, color: '#FF9F1C', fontFamily: 'Outfit', fontWeight: 'bold', align: 'left', defaultValue: 'Leader Name' },
        { id: 'designation', label: 'Designation', x: 230, y: 410, fontSize: 18, color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 'normal', align: 'left', defaultValue: 'Designation/Ward' },
        { id: 'message', label: 'Campaign Message', x: 230, y: 460, fontSize: 20, color: '#FFD700', fontFamily: 'Outfit', fontWeight: 'bold', align: 'left', defaultValue: 'Development & Integrity!' }
      ]
    };
  } else if (cat.includes('birthday') || cat.includes('anniversary')) {
    return {
      photoBox: { x: 200, y: 110, width: 200, height: 200 },
      texts: [
        { id: 'name', label: 'Name of Person', x: 300, y: 350, fontSize: 32, color: '#FFD700', fontFamily: 'Outfit', fontWeight: 'bold', align: 'center', defaultValue: 'Aman Sharma' },
        { id: 'message', label: 'Greeting Message', x: 300, y: 410, fontSize: 18, color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 'normal', align: 'center', defaultValue: 'Wishing you a day filled with happiness and a year filled with joy!' }
      ]
    };
  } else if (cat.includes('wedding')) {
    return {
      photoBox: { x: 200, y: 100, width: 200, height: 200 },
      texts: [
        { id: 'names', label: 'Groom & Bride Names', x: 300, y: 340, fontSize: 28, color: '#FFD700', fontFamily: 'Outfit', fontWeight: 'bold', align: 'center', defaultValue: 'Groom & Bride' },
        { id: 'date', label: 'Wedding Date', x: 300, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 'normal', align: 'center', defaultValue: 'December 18, 2026' },
        { id: 'venue', label: 'Venue Address', x: 300, y: 430, fontSize: 16, color: '#E0E0E0', fontFamily: 'Outfit', fontWeight: 'normal', align: 'center', defaultValue: 'Royal Palace, Hyderabad' }
      ]
    };
  }

  // Generic fallback configuration
  return {
    photoBox: { x: 200, y: 150, width: 200, height: 200 },
    texts: [
      { id: 'name', label: 'Name', x: 300, y: 390, fontSize: 26, color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 'bold', align: 'center', defaultValue: 'Your Name' }
    ]
  };
};

const runImport = async () => {
  console.log('=========================================');
  console.log(' JP CREATIVE NETWORK - BULK TEMPLATE IMPORTER');
  console.log('=========================================');

  if (!fs.existsSync(IMPORT_DIR)) {
    fs.mkdirSync(IMPORT_DIR, { recursive: true });
    console.log(`Created bulk import folder at: ${IMPORT_DIR}`);
    console.log('Please copy your template files from the pendrive into this folder and re-run the script.');
    process.exit(0);
  }

  console.log(`Scanning import folder: ${IMPORT_DIR}`);

  // Connect to DB
  await connectDB();

  try {
    // Read root files and directories
    const items = fs.readdirSync(IMPORT_DIR);
    
    // Group files by Category.
    // If files are directly in bulk-import-pending, they fall into 'General' category.
    // Subfolders represent specific categories.
    const importGroups = {};

    // Support a metadata.json in the root directory for custom pricing, titles, configs etc.
    let globalMetadata = [];
    const metadataPath = path.join(IMPORT_DIR, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        globalMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        console.log(`Loaded metadata.json index containing ${globalMetadata.length} configurations.`);
      } catch (err) {
        console.error('Warning: Failed to parse metadata.json. Using folder naming instead.', err.message);
      }
    }

    // Identify folders (categories) and files
    for (const item of items) {
      if (item === 'metadata.json' || item.startsWith('.')) continue;

      const itemPath = path.join(IMPORT_DIR, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const categoryName = item; // e.g. "Political"
        const catFiles = fs.readdirSync(itemPath);
        importGroups[categoryName] = catFiles.map(f => ({
          filename: f,
          path: path.join(itemPath, f),
          base: path.basename(f, path.extname(f)),
          ext: path.extname(f).toLowerCase()
        }));
      } else {
        // Files directly in the root folder go to "General"
        if (!importGroups['General']) {
          importGroups['General'] = [];
        }
        importGroups['General'].push({
          filename: item,
          path: itemPath,
          base: path.basename(item, path.extname(item)),
          ext: path.extname(item).toLowerCase()
        });
      }
    }

    const categoriesCount = Object.keys(importGroups).length;
    if (categoriesCount === 0) {
      console.log('No files found for import. Add images/videos in category subfolders inside "bulk-import-pending" folder.');
      mongoose.connection.close();
      return;
    }

    console.log(`Found ${categoriesCount} categories to process.`);

    for (const [catName, fileList] of Object.entries(importGroups)) {
      console.log(`\nProcessing category: "${catName}"...`);

      // 1. Find or create Category in DB
      let dbCategory = await Category.findOne({ name: { $regex: new RegExp(`^${catName}$`, 'i') } });
      if (!dbCategory) {
        dbCategory = await Category.create({
          name: catName,
          description: `Imported templates under ${catName} category.`,
        });
        console.log(`Created new Category in database: "${catName}" (Slug: ${dbCategory.slug})`);
      } else {
        console.log(`Found existing Category in database: "${dbCategory.name}"`);
      }

      // 2. Group files within the category to match preview images and source files.
      // E.g., if we have video.mp4 and video.jpg, they belong to the same template.
      const templatesMap = {};

      for (const file of fileList) {
        const isVideo = ['.mp4', '.webm', '.mov', '.avi'].includes(file.ext);
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(file.ext);

        if (!isVideo && !isImage) continue; // Skip unsupported types

        if (!templatesMap[file.base]) {
          templatesMap[file.base] = {
            base: file.base,
            videoFile: null,
            imageFile: null
          };
        }

        if (isVideo) {
          templatesMap[file.base].videoFile = file;
        } else if (isImage) {
          templatesMap[file.base].imageFile = file;
        }
      }

      // 3. Process each template item
      const templatesToProcess = Object.values(templatesMap);
      console.log(`Found ${templatesToProcess.length} template designs to import.`);

      for (const tplGroup of templatesToProcess) {
        try {
          const title = tplGroup.base
            .replace(/[_\-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase()); // Clean up file name as title

          // Check if template already exists
          const existingTpl = await Template.findOne({
            title: title,
            category: dbCategory._id
          });
          if (existingTpl) {
            console.log(`- Template "${title}" already exists. Skipping.`);
            continue;
          }

          // Check custom metadata.json overrides if matching base or filename
          const fileMeta = globalMetadata.find(m => 
            m.baseName === tplGroup.base || 
            (tplGroup.videoFile && m.fileName === tplGroup.videoFile.filename) ||
            (tplGroup.imageFile && m.fileName === tplGroup.imageFile.filename)
          ) || {};

          const price = fileMeta.price !== undefined ? Number(fileMeta.price) : 99;
          const description = fileMeta.description || `${catName} customizable premium template design.`;
          const isFeatured = fileMeta.isFeatured === true || false;
          const isPopular = fileMeta.isPopular === true || false;
          const tags = fileMeta.tags || [catName.toLowerCase(), tplGroup.videoFile ? 'video' : 'image'];

          let type = 'image';
          let sourceFileToUpload = null;
          let previewFileToUpload = null;

          if (tplGroup.videoFile) {
            type = 'video';
            sourceFileToUpload = tplGroup.videoFile;
            // The image file is the preview thumbnail
            previewFileToUpload = tplGroup.imageFile; 
          } else if (tplGroup.imageFile) {
            type = 'image';
            previewFileToUpload = tplGroup.imageFile;
          }

          if (!sourceFileToUpload && !previewFileToUpload) continue;

          console.log(`- Importing "${title}" (${type})...`);

          // Helper to copy file to local server/uploads with timestamp to simulate multer
          const copyToUploads = (sourceFile, prefix) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const destinationFilename = `${prefix}-${uniqueSuffix}${sourceFile.ext}`;
            const destinationPath = path.join(UPLOADS_DIR, destinationFilename);
            
            fs.copyFileSync(sourceFile.path, destinationPath);
            
            return {
              path: destinationPath,
              originalname: sourceFile.filename,
              filename: destinationFilename,
              mimetype: getMimeType(sourceFile.ext)
            };
          };

          let fileUrl = '';
          let previewUrl = '';

          // A. Process Video File if video template
          if (sourceFileToUpload) {
            const localCopy = copyToUploads(sourceFileToUpload, 'file');
            // This uploads to S3 (and unlinks local copy) or returns local static path URL
            fileUrl = await uploadFileToStorage(localCopy);
          }

          // B. Process Preview Image
          if (previewFileToUpload) {
            const localCopy = copyToUploads(previewFileToUpload, 'preview');
            previewUrl = await uploadFileToStorage(localCopy);
          } else {
            // No custom preview image provided for video template, use fallback unsplash link
            previewUrl = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop';
          }

          // Generate default overlay layout coordinate configuration
          const config = fileMeta.config || generateDefaultConfig(catName, type);

          // Create template entry
          await Template.create({
            title,
            description,
            price,
            type,
            previewUrl,
            fileUrl,
            category: dbCategory._id,
            isFeatured,
            isPopular,
            config,
            tags
          });

          console.log(`  -> Successfully imported template: "${title}"`);
        } catch (itemErr) {
          console.error(`  -> Failed to import template group "${tplGroup.base}": ${itemErr.message}`);
        }
      }
    }

    console.log('\n=========================================');
    console.log(' BULK IMPORT WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('=========================================');
    console.log('All new template files have been added.');
    console.log('You can now see them on the website listing and customize their fields in the Admin Dashboard.');

  } catch (error) {
    console.error('Error occurred during bulk import execution:', error);
  } finally {
    mongoose.connection.close();
  }
};

runImport();
