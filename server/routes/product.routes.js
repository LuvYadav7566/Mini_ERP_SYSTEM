import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockLedger,
  adjustStock,
} from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRoles } from '../middleware/role.middleware.js';

const router = express.Router();

// Publicly protected (requires login, but any authenticated user can view)
router.get('/', protect, getProducts);
router.get('/ledger', protect, getStockLedger);
router.get('/:id', protect, getProductById);
router.get('/:id/ledger', protect, getStockLedger);

// Action restricted by roles
router.post(
  '/',
  protect,
  checkRoles('Admin', 'Business Owner', 'Inventory Manager'),
  createProduct
);

router.put(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner', 'Inventory Manager'),
  updateProduct
);

router.post(
  '/:id/adjust-stock',
  protect,
  checkRoles('Admin', 'Business Owner', 'Inventory Manager'),
  adjustStock
);

router.delete(
  '/:id',
  protect,
  checkRoles('Admin', 'Business Owner'),
  deleteProduct
);

export default router;
