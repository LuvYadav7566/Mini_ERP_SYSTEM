import express from 'express';
import {
  getBoMs,
  getBoMById,
  createBoM,
  updateBoM,
  deleteBoM,
  getManufacturingOrders,
  getManufacturingOrderById,
  createManufacturingOrder,
  confirmManufacturingOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelManufacturingOrder,
} from '../controllers/manufacturing.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

// Bill of Materials (BoM) routes
router.get('/bom', protect, getBoMs);
router.get('/bom/:id', protect, getBoMById);

router.post(
  '/bom',
  protect,
  checkRoles('Admin', 'Business Owner', 'Manufacturing User', 'Inventory Manager'),
  createBoM
);

router.put(
  '/bom/:id',
  protect,
  checkRoles('Admin', 'Business Owner', 'Manufacturing User', 'Inventory Manager'),
  updateBoM
);

router.delete(
  '/bom/:id',
  protect,
  checkRoles('Admin', 'Business Owner'),
  deleteBoM
);

// Manufacturing Order (MO) routes
router.get('/mo', protect, getManufacturingOrders);
router.get('/mo/:id', protect, getManufacturingOrderById);

router.post(
  '/mo',
  protect,
  checkRoles('Admin', 'Business Owner', 'Manufacturing User'),
  createManufacturingOrder
);

router.post(
  '/mo/:id/confirm',
  protect,
  checkRoles('Admin', 'Business Owner', 'Manufacturing User', 'Inventory Manager'),
  confirmManufacturingOrder
);

router.post(
  '/mo/:id/work-order/:woId/start',
  protect,
  checkRoles('Admin', 'Manufacturing User'),
  startWorkOrder
);

router.post(
  '/mo/:id/work-order/:woId/complete',
  protect,
  checkRoles('Admin', 'Manufacturing User'),
  completeWorkOrder
);

router.post(
  '/mo/:id/cancel',
  protect,
  checkRoles('Admin', 'Business Owner', 'Manufacturing User'),
  cancelManufacturingOrder
);

export default router;
