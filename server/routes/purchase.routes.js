import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrderGoods,
  cancelPurchaseOrder,
} from '../controllers/purchase.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', protect, getPurchaseOrders);
router.get('/:id', protect, getPurchaseOrderById);

router.post(
  '/',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  createPurchaseOrder
);

router.put(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  updatePurchaseOrder
);

router.post(
  '/:id/confirm',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  confirmPurchaseOrder
);

router.post(
  '/:id/receive',
  protect,
  checkRoles('Admin', 'Business Owner', 'Inventory Manager', 'Purchase User'),
  receivePurchaseOrderGoods
);

router.post(
  '/:id/cancel',
  protect,
  checkRoles('Admin', 'Business Owner', 'Purchase User'),
  cancelPurchaseOrder
);

export default router;
