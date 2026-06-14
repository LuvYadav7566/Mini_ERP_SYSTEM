import express from 'express';
import {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  deliverSalesOrderGoods,
  cancelSalesOrder,
} from '../controllers/sales.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', protect, getSalesOrders);
router.get('/:id', protect, getSalesOrderById);

router.post(
  '/',
  protect,
  checkRoles('Admin', 'Business Owner', 'Sales User'),
  createSalesOrder
);

router.put(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner', 'Sales User'),
  updateSalesOrder
);

router.post(
  '/:id/confirm',
  protect,
  checkRoles('Admin', 'Business Owner', 'Sales User'),
  confirmSalesOrder
);

router.post(
  '/:id/deliver',
  protect,
  checkRoles('Admin', 'Business Owner', 'Inventory Manager', 'Sales User'),
  deliverSalesOrderGoods
);

router.post(
  '/:id/cancel',
  protect,
  checkRoles('Admin', 'Business Owner', 'Sales User'),
  cancelSalesOrder
);

export default router;
