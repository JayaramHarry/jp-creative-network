import ContactRequest from '../models/ContactRequest.js';
import CustomDesignRequest from '../models/CustomDesignRequest.js';
import { uploadFileToStorage } from '../services/s3Service.js';
import { sendInquiryEmail } from '../services/emailService.js';

export const createContactRequest = async (req, res) => {
  try {
    const { name, email, phone, businessName, subject, message } = req.body;

    const contact = await ContactRequest.create({
      name,
      email,
      phone,
      businessName,
      subject,
      message,
    });

    // Send email notification in background
    sendInquiryEmail({
      name,
      email,
      phone,
      businessName,
      subject,
      message,
    }).catch(err => console.error('Background email dispatch failed:', err.message));

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomDesignRequest = async (req, res) => {
  try {
    const { name, email, phone, requirementsDescription } = req.body;
    let referenceImage = '';

    if (req.file) {
      referenceImage = await uploadFileToStorage(req.file);
    }

    const request = await CustomDesignRequest.create({
      user: req.user ? req.user._id : undefined,
      name,
      email,
      phone,
      requirementsDescription,
      referenceImage,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContactRequests = async (req, res) => {
  try {
    const contacts = await ContactRequest.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomDesignRequests = async (req, res) => {
  try {
    const requests = await CustomDesignRequest.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateContactStatus = async (req, res) => {
  try {
    const contact = await ContactRequest.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    contact.status = req.body.status || contact.status;
    const updated = await contact.save();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomDesignStatus = async (req, res) => {
  try {
    const request = await CustomDesignRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = req.body.status || request.status;
    const updated = await request.save();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
