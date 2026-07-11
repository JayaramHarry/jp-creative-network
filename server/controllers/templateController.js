import Template from '../models/Template.js';
import Category from '../models/Category.js';
import { uploadFileToStorage } from '../services/s3Service.js';
import { processCustomVideo } from '../services/videoProcessor.js';
import path from 'path';
import fs from 'fs';

export const getTemplates = async (req, res) => {
  try {
    const { search, category, type, sort, tag, page = 1, limit = 9 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const cat = await Category.findOne({ slug: category });
        if (cat) {
          query.category = cat._id;
        } else {
          return res.json({
            success: true,
            count: 0,
            pagination: { page: Number(page), pages: 0, total: 0 },
            data: [],
          });
        }
      }
    }

    if (tag) {
      query.tags = tag;
    }

    if (type) {
      query.type = type;
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      if (sort === 'price-low') sortOption = { price: 1 };
      else if (sort === 'price-high') sortOption = { price: -1 };
      else if (sort === 'popular') sortOption = { isPopular: -1 };
      else if (sort === 'featured') sortOption = { isFeatured: -1 };
      else if (sort === 'oldest') sortOption = { createdAt: 1 };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Template.countDocuments(query);
    const templates = await Template.find(query)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      count: templates.length,
      pagination: {
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
      },
      data: templates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).populate('category', 'name slug');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const related = await Template.find({
      category: template.category._id,
      _id: { $ne: template._id }
    })
      .limit(4)
      .populate('category', 'name slug');

    res.json({
      success: true,
      data: template,
      related
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { title, description, price, type, category, config, isFeatured, isPopular, tags } = req.body;

    const files = req.files || {};
    let previewUrl = '';
    let fileUrl = '';

    if (type === 'video') {
      if (!files.file || !files.file[0]) {
        return res.status(400).json({ success: false, message: 'Please upload a video file for video templates' });
      }
      fileUrl = await uploadFileToStorage(files.file[0]);

      if (files.preview && files.preview[0]) {
        previewUrl = await uploadFileToStorage(files.preview[0]);
      } else {
        previewUrl = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop';
      }
    } else {
      if (!files.preview || !files.preview[0]) {
        return res.status(400).json({ success: false, message: 'Please upload a preview image' });
      }
      previewUrl = await uploadFileToStorage(files.preview[0]);
      if (files.file && files.file[0]) {
        fileUrl = await uploadFileToStorage(files.file[0]);
      }
    }

    let parsedConfig = {};
    if (config) {
      try {
        parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (err) {
        console.error('Config parsing error:', err);
      }
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (err) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const template = await Template.create({
      title,
      description,
      price: Number(price),
      type,
      previewUrl,
      fileUrl,
      category,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isPopular: isPopular === 'true' || isPopular === true,
      config: parsedConfig,
      tags: parsedTags,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { title, description, price, type, category, config, isFeatured, isPopular, tags } = req.body;

    let template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    let previewUrl = template.previewUrl;
    let fileUrl = template.fileUrl;

    const files = req.files || {};
    const currentType = type || template.type;

    if (currentType === 'video') {
      if (files.file && files.file[0]) {
        fileUrl = await uploadFileToStorage(files.file[0]);
      } else if (!fileUrl) {
        return res.status(400).json({ success: false, message: 'Please upload a video file for video templates' });
      }

      if (files.preview && files.preview[0]) {
        previewUrl = await uploadFileToStorage(files.preview[0]);
      } else if (!previewUrl) {
        previewUrl = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop';
      }
    } else {
      if (files.preview && files.preview[0]) {
        previewUrl = await uploadFileToStorage(files.preview[0]);
      } else if (!previewUrl) {
        return res.status(400).json({ success: false, message: 'Please upload a preview image' });
      }
      if (files.file && files.file[0]) {
        fileUrl = await uploadFileToStorage(files.file[0]);
      }
    }

    let parsedConfig = template.config;
    if (config) {
      try {
        parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (err) {
        console.error('Config update parsing error:', err);
      }
    }

    let parsedTags = template.tags;
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (err) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    template.title = title || template.title;
    template.description = description || template.description;
    template.price = price !== undefined ? Number(price) : template.price;
    template.type = type || template.type;
    template.category = category || template.category;
    template.previewUrl = previewUrl;
    template.fileUrl = fileUrl;
    template.isFeatured = isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : template.isFeatured;
    template.isPopular = isPopular !== undefined ? (isPopular === 'true' || isPopular === true) : template.isPopular;
    template.config = parsedConfig;
    template.tags = parsedTags;

    const updatedTemplate = await template.save();
    res.json({ success: true, data: updatedTemplate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    await template.deleteOne();
    res.json({ success: true, message: 'Template removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processVideo = async (req, res) => {
  try {
    const { templateId, audioOption, trimStart, trimEnd, userName, originalVolume, customAudioVolume, bgMusicVolume, duration, inserts } = req.body;
    const filesArray = Array.isArray(req.files) ? req.files : [];
    const files = {};
    filesArray.forEach(f => {
      if (!files[f.fieldname]) {
        files[f.fieldname] = [];
      }
      files[f.fieldname].push(f);
    });

    const silentVideoFile = files.video ? files.video[0] : null;
    if (!silentVideoFile) {
      return res.status(400).json({ success: false, message: 'Missing video canvas recording file' });
    }

    const customAudioFile = files.audio ? files.audio[0] : null;
    const bgMusicFile = files.bgMusic ? files.bgMusic[0] : null;

    let audioPath = '';
    if (customAudioFile) {
      audioPath = customAudioFile.path;
    } else if (req.body.customAudioUrl) {
      let filename = '';
      if (req.body.customAudioUrl.includes('/uploads/')) {
        filename = req.body.customAudioUrl.split('/uploads/')[1];
      } else {
        filename = path.basename(req.body.customAudioUrl);
      }
      audioPath = path.join(process.cwd(), 'uploads', filename);
    }

    let bgMusicPath = '';
    if (bgMusicFile) {
      bgMusicPath = bgMusicFile.path;
    } else if (req.body.bgMusicUrl) {
      let filename = '';
      if (req.body.bgMusicUrl.includes('/uploads/')) {
        filename = req.body.bgMusicUrl.split('/uploads/')[1];
      } else {
        filename = path.basename(req.body.bgMusicUrl);
      }
      bgMusicPath = path.join(process.cwd(), 'uploads', filename);
    }

    // Resolve template original video path if keep is selected
    let originalVideoPath = '';
    let templateTitle = 'custom_video';
    if (templateId) {
      const template = await Template.findById(templateId);
      if (template) {
        templateTitle = template.title;
        if (template.fileUrl) {
          let filename = '';
          if (template.fileUrl.includes('/uploads/')) {
            filename = template.fileUrl.split('/uploads/')[1];
          } else {
            filename = path.basename(template.fileUrl);
          }
          originalVideoPath = path.join(process.cwd(), 'uploads', filename);
        }
      }
    }

    // Resolve insert paths
    const parsedInserts = inserts ? JSON.parse(inserts) : null;
    if (parsedInserts) {
      parsedInserts.forEach(insert => {
        if (insert.videoIndex !== undefined && insert.videoIndex >= 0) {
          const fieldName = `insert_video_${insert.videoIndex}`;
          if (files[fieldName] && files[fieldName][0]) {
            insert.videoPath = files[fieldName][0].path;
          }
        } else if (insert.url) {
          let filename = '';
          if (insert.url.includes('/uploads/')) {
            filename = insert.url.split('/uploads/')[1];
            insert.videoPath = path.join(process.cwd(), 'uploads', filename);
          }
        }

        if (insert.audioIndex !== undefined && insert.audioIndex >= 0) {
          const fieldName = `insert_audio_${insert.audioIndex}`;
          if (files[fieldName] && files[fieldName][0]) {
            insert.audioPath = files[fieldName][0].path;
          }
        }
      });
    }

    // Resolve overlay paths
    const parsedOverlays = req.body.overlays ? JSON.parse(req.body.overlays) : null;
    if (parsedOverlays) {
      parsedOverlays.forEach(overlay => {
        if (overlay.videoIndex !== undefined && overlay.videoIndex >= 0) {
          const fieldName = `overlay_video_${overlay.videoIndex}`;
          if (files[fieldName] && files[fieldName][0]) {
            overlay.videoPath = files[fieldName][0].path;
          }
        }
        if (overlay.audioIndex !== undefined && overlay.audioIndex >= 0) {
          const fieldName = `overlay_audio_${overlay.audioIndex}`;
          if (files[fieldName] && files[fieldName][0]) {
            overlay.audioPath = files[fieldName][0].path;
          }
        }
      });
    }

    // Prepare temp output path
    const outputFilename = `output_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;
    const outputPath = path.join(process.cwd(), 'uploads', outputFilename);

    await processCustomVideo({
      videoPath: silentVideoFile.path,
      originalVideoPath,
      audioPath,
      audioOption,
      trimStart: trimStart ? parseFloat(trimStart) : 0,
      trimEnd: trimEnd ? parseFloat(trimEnd) : 0,
      bgMusicPath,
      originalVolume: originalVolume !== undefined ? parseFloat(originalVolume) : 1.0,
      customAudioVolume: customAudioVolume !== undefined ? parseFloat(customAudioVolume) : 1.0,
      bgMusicVolume: bgMusicVolume !== undefined ? parseFloat(bgMusicVolume) : 0.5,
      duration: duration ? parseFloat(duration) : null,
      inserts: parsedInserts,
      overlays: parsedOverlays,
      outputPath
    });

    // Clean up all temporary uploaded files automatically
    filesArray.forEach(f => {
      if (f.path && fs.existsSync(f.path)) {
        fs.unlink(f.path, (err) => {
          if (err) console.error('Error cleaning up temp file:', err);
        });
      }
    });

    // Set proper header for attachment download filename
    const safeTitle = templateTitle.toLowerCase().replace(/[^a-z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_');
    const safeUser = userName ? userName.toLowerCase().replace(/[^a-z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_') : '';
    const finalFilename = safeUser ? `${safeTitle}_${safeUser}.mp4` : `${safeTitle}.mp4`;

    const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${host}/uploads/${outputFilename}`;

    // Background file cleanup
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        fs.unlink(outputPath, (err) => {
          if (err) console.error('Error deleting temp output file:', err);
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    res.json({
      success: true,
      fileUrl,
      filename: finalFilename
    });
  } catch (error) {
    console.error('Error in processVideo controller:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
