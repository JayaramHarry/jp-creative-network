import Service from '../models/Service.js';
import { uploadFileToStorage } from '../services/s3Service.js';

export const getServices = async (req, res) => {
  try {
    const services = await Service.find({});
    res.json({ success: true, count: services.length, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = await uploadFileToStorage(req.file);
    }

    const serviceExists = await Service.findOne({ title });
    if (serviceExists) {
      return res.status(400).json({ success: false, message: 'Service with this title already exists' });
    }

    const service = await Service.create({
      title,
      description,
      price: price || 'Contact for pricing',
      image: imageUrl,
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    let imageUrl = service.image;
    if (req.file) {
      imageUrl = await uploadFileToStorage(req.file);
    }

    service.title = title || service.title;
    service.description = description || service.description;
    service.price = price !== undefined ? price : service.price;
    service.image = imageUrl;

    const updatedService = await service.save();
    res.json({ success: true, data: updatedService });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await service.deleteOne();
    res.json({ success: true, message: 'Service removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
