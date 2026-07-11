import express from 'express';
import {
  createContactRequest,
  createCustomDesignRequest,
  getContactRequests,
  getCustomDesignRequests,
  updateContactStatus,
  updateCustomDesignStatus,
} from '../controllers/contactController.js';
import { protect, admin, optionalProtect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/', createContactRequest);
router.post('/custom-design', optionalProtect, upload.single('reference'), createCustomDesignRequest);

// Admin routes
router.get('/requests', protect, admin, getContactRequests);
router.get('/custom-designs', protect, admin, getCustomDesignRequests);
router.put('/requests/:id', protect, admin, updateContactStatus);
router.put('/custom-designs/:id', protect, admin, updateCustomDesignStatus);

export default router;
