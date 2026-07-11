import Category from '../models/Category.js';
import { uploadFileToStorage } from '../services/s3Service.js';

export const INDIAN_PARTIES = [
  {
    id: 'bjp',
    name: 'Bharatiya Janata Party (BJP)',
    symbol: 'Lotus',
    color: '#FF9F1C',
    logo: '/assets/symbols/bjp.png',
    description: 'National party with saffron and green flag.',
  },
  {
    id: 'inc',
    name: 'Indian National Congress (INC)',
    symbol: 'Hand',
    color: '#00A896',
    logo: '/assets/symbols/inc.png',
    description: 'One of the oldest democratic political parties.',
  },
  {
    id: 'aap',
    name: 'Aam Aadmi Party (AAP)',
    symbol: 'Broom',
    color: '#028090',
    logo: '/assets/symbols/aap.png',
    description: 'Representing the common man.',
  },
  {
    id: 'bsp',
    name: 'Bahujan Samaj Party (BSP)',
    symbol: 'Elephant',
    color: '#05668D',
    logo: '/assets/symbols/bsp.png',
    description: 'Representing social change and Bahujans.',
  },
  {
    id: 'cpim',
    name: 'Communist Party of India (Marxist)',
    symbol: 'Hammer & Sickle',
    color: '#D62246',
    logo: '/assets/symbols/cpim.png',
    description: 'Left-wing socialist movement representation.',
  },
  {
    id: 'tmc',
    name: 'Trinamool Congress (TMC)',
    symbol: 'Twin Flowers',
    color: '#4AD66D',
    logo: '/assets/symbols/tmc.png',
    description: 'Grassroots democracy and representation.',
  }
];

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category;
    
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(idOrSlug);
    } else {
      category = await Category.findOne({ slug: idOrSlug });
    }

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const isPolitical = category.name.toLowerCase().includes('political');
    res.json({
      success: true,
      data: category,
      parties: isPolitical ? INDIAN_PARTIES : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = await uploadFileToStorage(req.file);
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      description,
      image: imageUrl,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let imageUrl = category.image;
    if (req.file) {
      imageUrl = await uploadFileToStorage(req.file);
    }

    category.name = name || category.name;
    category.description = description || category.description;
    category.image = imageUrl;

    const updatedCategory = await category.save();
    res.json({ success: true, data: updatedCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
