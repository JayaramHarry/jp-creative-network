import express from 'express';
import {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset
} from '../controllers/presetController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get('/', getPresets);
router.post('/', protect, admin, upload.single('file'), createPreset);
router.put('/:id', protect, admin, upload.single('file'), updatePreset);
router.delete('/:id', protect, admin, deletePreset);

export default router;
