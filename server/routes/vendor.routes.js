import express from 'express';
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../controllers/vendor.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', protect, getVendors);

router.post(
  '/',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  createVendor
);

router.put(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  updateVendor
);

router.delete(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner'),
  deleteVendor
);

export default router;
