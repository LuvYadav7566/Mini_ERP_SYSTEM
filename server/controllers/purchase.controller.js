import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';

// Helper: Generate PO Number (PO-YYYY-0001)
const generatePONumber = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const count = await PurchaseOrder.countDocuments({
    createdAt: { $gte: startOfYear, $lte: endOfYear }
  });

  return `PO-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Get all purchase orders
// @route   GET /api/v1/purchase
// @access  Private
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.find({})
      .populate('vendor', 'name contactPerson email phone')
      .populate('createdBy', 'username role')
      .populate('items.product', 'sku name category')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase order by ID
// @route   GET /api/v1/purchase/:id
// @access  Private
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('vendor', 'name contactPerson email phone')
      .populate('createdBy', 'username role')
      .populate('items.product', 'sku name category costPrice salesPrice freeToUse reserved');

    if (!order) {
      res.status(404);
      throw new Error('Purchase Order not found');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new purchase order
// @route   POST /api/v1/purchase
// @access  Private/Admin, Business Owner, Purchase User
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { vendor, items, notes } = req.body;

    if (!vendor || !items || items.length === 0) {
      res.status(400);
      throw new Error('Preferred Vendor and at least one item are required');
    }

    // Validate products exist and fetch cost prices
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.product}`);
      }

      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        res.status(400);
        throw new Error(`Invalid quantity for product ${product.name}`);
      }

      // Use either specified cost price or the product's database cost price
      const costPrice = parseFloat(item.costPrice) >= 0 ? parseFloat(item.costPrice) : product.costPrice;
      const subtotal = quantity * costPrice;
      totalAmount += subtotal;

      orderItems.push({
        product: product._id,
        quantity,
        costPrice,
        quantityReceived: 0,
      });
    }

    const poNumber = await generatePONumber();

    const order = new PurchaseOrder({
      poNumber,
      vendor,
      items: orderItems,
      totalAmount,
      notes,
      createdBy: req.user._id,
      status: 'Draft',
    });

    const savedOrder = await order.save();
    
    // Return populated order
    const populated = await PurchaseOrder.findById(savedOrder._id)
      .populate('vendor', 'name')
      .populate('items.product', 'sku name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a purchase order (Draft only)
// @route   PUT /api/v1/purchase/:id
// @access  Private/Admin, Business Owner, Purchase User
export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Purchase Order not found');
    }

    if (order.status !== 'Draft') {
      res.status(400);
      throw new Error('Only Draft Purchase Orders can be updated');
    }

    const { vendor, items, notes } = req.body;

    if (vendor) order.vendor = vendor;
    if (notes !== undefined) order.notes = notes;

    if (items && items.length > 0) {
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          res.status(404);
          throw new Error(`Product not found: ${item.product}`);
        }

        const quantity = parseInt(item.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          res.status(400);
          throw new Error(`Invalid quantity for product ${product.name}`);
        }

        const costPrice = parseFloat(item.costPrice) >= 0 ? parseFloat(item.costPrice) : product.costPrice;
        totalAmount += quantity * costPrice;

        orderItems.push({
          product: product._id,
          quantity,
          costPrice,
          quantityReceived: 0,
        });
      }
      order.items = orderItems;
      order.totalAmount = totalAmount;
    }

    const updatedOrder = await order.save();
    const populated = await PurchaseOrder.findById(updatedOrder._id)
      .populate('vendor', 'name')
      .populate('items.product', 'sku name');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm a purchase order (Draft -> Confirmed)
// @route   POST /api/v1/purchase/:id/confirm
// @access  Private/Admin, Business Owner, Purchase User
export const confirmPurchaseOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Purchase Order not found');
    }

    if (order.status !== 'Draft') {
      res.status(400);
      throw new Error('Only Draft Purchase Orders can be confirmed');
    }

    order.status = 'Confirmed';
    order.confirmedAt = new Date();

    const savedOrder = await order.save();
    res.json(savedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Receive goods for a purchase order (Confirmed/Partially Received states)
// @route   POST /api/v1/purchase/:id/receive
// @access  Private/Admin, Business Owner, Inventory Manager, Purchase User
export const receivePurchaseOrderGoods = async (req, res, next) => {
  try {
    const { itemsReceived } = req.body; // Array of { product: ID, quantityReceived: Number }

    if (!itemsReceived || itemsReceived.length === 0) {
      res.status(400);
      throw new Error('Please specify items and quantities received');
    }

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Purchase Order not found');
    }

    if (order.status !== 'Confirmed' && order.status !== 'Partially Received') {
      res.status(400);
      throw new Error('Goods can only be received for Confirmed or Partially Received Purchase Orders');
    }

    // Process each received item
    for (const itemRec of itemsReceived) {
      const poItemIndex = order.items.findIndex(
        (i) => i.product.toString() === itemRec.product.toString()
      );

      if (poItemIndex === -1) {
        res.status(400);
        throw new Error(`Product ${itemRec.product} is not part of this Purchase Order`);
      }

      const poItem = order.items[poItemIndex];
      const qtyRec = parseInt(itemRec.quantityReceived);

      if (isNaN(qtyRec) || qtyRec <= 0) {
        continue; // Skip invalid or zero adjustments
      }

      const totalNewReceived = poItem.quantityReceived + qtyRec;
      if (totalNewReceived > poItem.quantity) {
        res.status(400);
        throw new Error(
          `Cannot receive ${qtyRec} units for product ${itemRec.product}. Pushing total received (${totalNewReceived}) past ordered quantity (${poItem.quantity})`
        );
      }

      // Update PO item quantity received
      poItem.quantityReceived = totalNewReceived;

      // Update physical Product inventory levels
      const product = await Product.findById(poItem.product);
      const prevOnHand = product.freeToUse + product.reserved;
      product.freeToUse += qtyRec;
      await product.save();

      // Create Stock Ledger transaction entry
      await StockLedger.create({
        product: product._id,
        quantityChange: qtyRec,
        prevOnHand,
        newOnHand: product.freeToUse + product.reserved,
        transactionType: 'Purchase Receipt',
        referenceId: order.poNumber,
        performedBy: req.user._id,
        notes: `Received items via Purchase Order ${order.poNumber}`,
      });
    }

    // Determine order status
    let allFullyReceived = true;
    let anyReceived = false;

    for (const item of order.items) {
      if (item.quantityReceived < item.quantity) {
        allFullyReceived = false;
      }
      if (item.quantityReceived > 0) {
        anyReceived = true;
      }
    }

    if (allFullyReceived) {
      order.status = 'Fully Received';
      order.completedAt = new Date();
    } else if (anyReceived) {
      order.status = 'Partially Received';
    }

    const savedOrder = await order.save();
    
    const populated = await PurchaseOrder.findById(savedOrder._id)
      .populate('vendor', 'name contactPerson')
      .populate('items.product', 'sku name category freeToUse reserved');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a purchase order
// @route   POST /api/v1/purchase/:id/cancel
// @access  Private/Admin, Business Owner, Purchase User
export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Purchase Order not found');
    }

    // Cannot cancel if goods are already received
    if (order.status === 'Partially Received' || order.status === 'Fully Received') {
      res.status(400);
      throw new Error('Cannot cancel Purchase Orders after goods have been partially/fully received');
    }

    if (order.status === 'Cancelled') {
      res.status(400);
      throw new Error('Purchase Order is already cancelled');
    }

    order.status = 'Cancelled';
    const savedOrder = await order.save();
    res.json(savedOrder);
  } catch (error) {
    next(error);
  }
};
