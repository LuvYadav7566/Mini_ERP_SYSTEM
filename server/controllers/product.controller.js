import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by ID
// @route   GET /api/v1/products/:id
// @access  Private
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/v1/products
// @access  Private/Admin, Business Owner, Inventory Manager
export const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      salesPrice,
      costPrice,
      freeToUse,
      onHand,
      procurementStrategy,
      procureOnDemand,
      procurementType,
      vendor,
      bom,
    } = req.body;

    const skuExists = await Product.findOne({ sku: sku.trim().toUpperCase() });
    if (skuExists) {
      res.status(400);
      throw new Error(`Product with SKU '${sku}' already exists`);
    }

    const initialFreeToUse = freeToUse !== undefined ? freeToUse : (onHand || 0);

    const product = new Product({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      description,
      category,
      salesPrice,
      costPrice,
      freeToUse: initialFreeToUse,
      reserved: 0,
      procurementStrategy,
      procureOnDemand,
      procurementType,
      vendor,
      bom: bom || null,
    });

    const createdProduct = await product.save();

    // If initial stock is specified, record it in the ledger
    if (createdProduct.freeToUse > 0) {
      await StockLedger.create({
        product: createdProduct._id,
        quantityChange: createdProduct.freeToUse,
        prevOnHand: 0,
        newOnHand: createdProduct.freeToUse,
        transactionType: 'System Initialization',
        referenceId: 'INITIAL_STOCK',
        performedBy: req.user._id,
        notes: 'Initial stock upon product creation',
      });
    }

    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin, Business Owner, Inventory Manager
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const {
      name,
      description,
      category,
      salesPrice,
      costPrice,
      freeToUse,
      onHand,
      procurementStrategy,
      procureOnDemand,
      procurementType,
      vendor,
      bom,
    } = req.body;

    // Handle SKU modification block (standard practice: SKU shouldn't change easily)
    if (req.body.sku && req.body.sku.trim().toUpperCase() !== product.sku) {
      const skuExists = await Product.findOne({ sku: req.body.sku.trim().toUpperCase() });
      if (skuExists) {
        res.status(400);
        throw new Error(`Product with SKU '${req.body.sku}' already exists`);
      }
      product.sku = req.body.sku.trim().toUpperCase();
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (salesPrice !== undefined) product.salesPrice = salesPrice;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (procurementStrategy !== undefined) product.procurementStrategy = procurementStrategy;
    if (procureOnDemand !== undefined) product.procureOnDemand = procureOnDemand;
    if (procurementType !== undefined) product.procurementType = procurementType;
    if (vendor !== undefined) product.vendor = vendor;
    if (bom !== undefined) product.bom = bom || null;

    // If freeToUse is updated, record adjustment
    const targetFreeToUse = freeToUse !== undefined ? freeToUse : (onHand !== undefined ? (onHand - product.reserved) : undefined);
    if (targetFreeToUse !== undefined && targetFreeToUse !== product.freeToUse) {
      const prevVal = product.freeToUse;
      const difference = targetFreeToUse - prevVal;
      product.freeToUse = targetFreeToUse;

      await StockLedger.create({
        product: product._id,
        quantityChange: difference,
        prevOnHand: prevVal + product.reserved,
        newOnHand: targetFreeToUse + product.reserved,
        transactionType: 'Inventory Adjustment',
        referenceId: 'MANUAL_ADJUSTMENT',
        performedBy: req.user._id,
        notes: req.body.adjustmentNotes || 'Manual inventory adjustment via product update',
      });
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin, Business Owner
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // Check if product has ledger history (could be checked, but for now we just delete ledger entries too or prevent deletion)
    // To maintain integrity, we delete associated stock ledger entries, but in production we'd soft delete or block
    await StockLedger.deleteMany({ product: product._id });
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product and associated ledger entries deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stock ledger for all products or a specific product
// @route   GET /api/v1/products/ledger or GET /api/v1/products/:id/ledger
// @access  Private
export const getStockLedger = async (req, res, next) => {
  try {
    const filter = {};
    if (req.params.id) {
      filter.product = req.params.id;
    }

    const ledger = await StockLedger.find(filter)
      .populate('product', 'name sku category')
      .populate('performedBy', 'username role')
      .sort({ createdAt: -1 });

    res.json(ledger);
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust product stock directly
// @route   POST /api/v1/products/:id/adjust-stock
// @access  Private/Admin, Business Owner, Inventory Manager
export const adjustStock = async (req, res, next) => {
  try {
    const { quantityChange, notes } = req.body;

    if (quantityChange === undefined || isNaN(quantityChange) || quantityChange === 0) {
      res.status(400);
      throw new Error('Please provide a valid non-zero quantity change');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const prevFreeToUse = product.freeToUse;
    const newFreeToUse = prevFreeToUse + quantityChange;
    const prevOnHand = prevFreeToUse + product.reserved;
    const newOnHand = newFreeToUse + product.reserved;

    if (newOnHand < 0) {
      res.status(400);
      throw new Error(`Cannot adjust stock: New stock value would be negative (${newOnHand})`);
    }

    product.freeToUse = newFreeToUse;
    const updatedProduct = await product.save();

    await StockLedger.create({
      product: product._id,
      quantityChange,
      prevOnHand,
      newOnHand,
      transactionType: 'Inventory Adjustment',
      referenceId: 'STOCK_ADJUSTMENT_API',
      performedBy: req.user._id,
      notes: notes || 'Manual stock level adjustment',
    });

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};
