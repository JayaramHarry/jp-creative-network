import express from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  processVideo,
} from '../controllers/templateController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get('/', getTemplates);
router.get('/:id', getTemplateById);

router.post(
  '/',
  protect,
  admin,
  upload.fields([
    { name: 'preview', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  createTemplate
);

router.put(
  '/:id',
  protect,
  admin,
  upload.fields([
    { name: 'preview', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  updateTemplate
);

router.post(
  '/process-video',
  protect,
  upload.any(),
  processVideo
);

router.delete('/:id', protect, admin, deleteTemplate);

import { removeBackground } from '../services/backgroundRemovalService.js';
router.post('/remove-background', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image base64 parameter is required' });
    }
    const transparentDataUrl = await removeBackground(image);
    res.json({ success: true, url: transparentDataUrl });
  } catch (error) {
    console.error('[Route remove-background] error:', error);
    res.status(500).json({ success: false, message: error.message || 'Background removal failed' });
  }
});

export default router;
