import express from 'express';
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  downloadTemplateFile,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
} from '../controllers/orderController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/create', protect, createOrder);
router.post('/upload-audio', protect, upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No audio file uploaded' });
  }
  const host = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${host}/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});
router.post('/verify', protect, verifyPayment);
router.get('/my-orders', protect, getMyOrders);
router.get('/download/:templateId', protect, downloadTemplateFile);
router.get('/:id', protect, getOrderById);

// Admin routes
router.get('/', protect, admin, getAllOrders);
router.put('/:id', protect, admin, updateOrderStatus);

export default router;
