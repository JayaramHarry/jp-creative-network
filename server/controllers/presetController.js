import Preset from '../models/Preset.js';
import { uploadPresetAsset, deletePresetAsset } from '../services/presetStorageService.js';

export const getPresets = async (req, res) => {
  try {
    const filter = {};
    if (!req.query.all || req.query.all !== 'true') {
      filter.enabled = true;
    }
    const presets = await Preset.find(filter);
    res.json({ success: true, count: presets.length, data: presets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPreset = async (req, res) => {
  try {
    const { name, category, tags, enabled } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a preset asset file' });
    }

    const url = await uploadPresetAsset(req.file);
    
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    const preset = await Preset.create({
      name,
      url,
      category,
      tags: parsedTags,
      enabled: enabled === 'false' ? false : true
    });

    res.status(201).json({ success: true, data: preset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePreset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, tags, enabled } = req.body;
    
    const preset = await Preset.findById(id);
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' });
    }

    if (name) preset.name = name;
    if (category) preset.category = category;
    if (enabled !== undefined) preset.enabled = enabled === 'true' || enabled === true;

    if (tags) {
      preset.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    if (req.file) {
      if (preset.url) {
        await deletePresetAsset(preset.url);
      }
      preset.url = await uploadPresetAsset(req.file);
    }

    await preset.save();
    res.json({ success: true, data: preset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePreset = async (req, res) => {
  try {
    const { id } = req.params;
    const preset = await Preset.findById(id);
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' });
    }

    if (preset.url) {
      await deletePresetAsset(preset.url);
    }
    await preset.deleteOne();
    res.json({ success: true, message: 'Preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
