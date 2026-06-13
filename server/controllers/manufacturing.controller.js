import BoM from '../models/BoM.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';

// Helper: Generate MO Number (MO-YYYY-0001)
const generateMONumber = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const count = await ManufacturingOrder.countDocuments({
    createdAt: { $gte: startOfYear, $lte: endOfYear }
  });

  return `MO-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

/* ==========================================================================
   BILL OF MATERIALS (BoM) CONTROLLERS
   ========================================================================== */

// @desc    Get all BoMs
// @route   GET /api/v1/manufacturing/bom
// @access  Private
export const getBoMs = async (req, res, next) => {
  try {
    const boms = await BoM.find({})
      .populate('product', 'sku name category')
      .populate('components.product', 'sku name category costPrice')
      .sort({ name: 1 });
    res.json(boms);
  } catch (error) {
    next(error);
  }
};

// @desc    Get BoM by ID
// @route   GET /api/v1/manufacturing/bom/:id
// @access  Private
export const getBoMById = async (req, res, next) => {
  try {
    const bom = await BoM.findById(req.params.id)
      .populate('product', 'sku name category')
      .populate('components.product', 'sku name category costPrice');

    if (!bom) {
      res.status(404);
      throw new Error('Bill of Materials not found');
    }
    res.json(bom);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new BoM recipe
// @route   POST /api/v1/manufacturing/bom
// @access  Private/Admin, Business Owner, Manufacturing User, Inventory Manager
export const createBoM = async (req, res, next) => {
  try {
    const { product, name, components, operations, notes } = req.body;

    if (!product || !name || !components || components.length === 0) {
      res.status(400);
      throw new Error('Product, Recipe Name, and at least one Component are required');
    }

    // Check if product already has a BoM
    const bomExists = await BoM.findOne({ product });
    if (bomExists) {
      res.status(400);
      throw new Error('This product already has a registered Bill of Materials');
    }

    const bom = new BoM({
      product,
      name: name.trim(),
      components,
      operations: operations || [],
      notes,
    });

    const savedBoM = await bom.save();

    // Link BoM to the Product model
    await Product.findByIdAndUpdate(product, { bom: savedBoM._id });

    const populated = await BoM.findById(savedBoM._id)
      .populate('product', 'sku name')
      .populate('components.product', 'sku name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a BoM recipe
// @route   PUT /api/v1/manufacturing/bom/:id
// @access  Private/Admin, Business Owner, Manufacturing User, Inventory Manager
export const updateBoM = async (req, res, next) => {
  try {
    const bom = await BoM.findById(req.params.id);
    if (!bom) {
      res.status(404);
      throw new Error('Bill of Materials not found');
    }

    const { name, components, operations, notes } = req.body;

    if (name) bom.name = name.trim();
    if (components && components.length > 0) bom.components = components;
    if (operations) bom.operations = operations;
    if (notes !== undefined) bom.notes = notes;

    const updatedBoM = await bom.save();
    
    const populated = await BoM.findById(updatedBoM._id)
      .populate('product', 'sku name')
      .populate('components.product', 'sku name');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a BoM recipe
// @route   DELETE /api/v1/manufacturing/bom/:id
// @access  Private/Admin, Business Owner
export const deleteBoM = async (req, res, next) => {
  try {
    const bom = await BoM.findById(req.params.id);
    if (!bom) {
      res.status(404);
      throw new Error('Bill of Materials not found');
    }

    // Check if active manufacturing orders are using this BoM
    const activeMO = await ManufacturingOrder.findOne({
      bom: req.params.id,
      status: { $in: ['Confirmed', 'In Progress'] }
    });

    if (activeMO) {
      res.status(400);
      throw new Error('Cannot delete BoM while active Manufacturing Orders depend on it');
    }

    // Remove link in Product
    await Product.findByIdAndUpdate(bom.product, { bom: null });
    await BoM.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bill of Materials deleted successfully' });
  } catch (error) {
    next(error);
  }
};


/* ==========================================================================
   MANUFACTURING ORDERS (MO) CONTROLLERS
   ========================================================================== */

// @desc    Get all manufacturing orders
// @route   GET /api/v1/manufacturing/mo
// @access  Private
export const getManufacturingOrders = async (req, res, next) => {
  try {
    const orders = await ManufacturingOrder.find({})
      .populate('product', 'sku name category freeToUse reserved')
      .populate('bom', 'name')
      .populate('createdBy', 'username role')
      .populate('assignee', 'username role')
      .populate('components.product', 'sku name category freeToUse reserved')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get manufacturing order by ID
// @route   GET /api/v1/manufacturing/mo/:id
// @access  Private
export const getManufacturingOrderById = async (req, res, next) => {
  try {
    const order = await ManufacturingOrder.findById(req.params.id)
      .populate('product', 'sku name category freeToUse reserved')
      .populate('bom', 'name')
      .populate('createdBy', 'username role')
      .populate('assignee', 'username role')
      .populate('components.product', 'sku name category freeToUse reserved');

    if (!order) {
      res.status(404);
      throw new Error('Manufacturing Order not found');
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new manufacturing order (Draft)
// @route   POST /api/v1/manufacturing/mo
// @access  Private/Admin, Business Owner, Manufacturing User
export const createManufacturingOrder = async (req, res, next) => {
  try {
    const { product, quantity, assignee, notes } = req.body;

    if (!product || !quantity || quantity <= 0) {
      res.status(400);
      throw new Error('Product and positive quantity are required');
    }

    // Fetch product to retrieve its BoM
    const prodDetails = await Product.findById(product);
    if (!prodDetails) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (!prodDetails.bom) {
      res.status(400);
      throw new Error(`Product '${prodDetails.name}' does not have a registered Bill of Materials recipe.`);
    }

    const bomDetails = await BoM.findById(prodDetails.bom).populate('components.product');
    if (!bomDetails) {
      res.status(404);
      throw new Error('Linked Bill of Materials not found');
    }

    // Generate component requirements based on MO quantity
    const components = bomDetails.components.map((c) => ({
      product: c.product._id,
      quantityRequired: c.quantity * quantity,
      quantityConsumed: 0,
    }));

    // Clone Work Orders from BoM operations
    const workOrders = bomDetails.operations.map((op) => ({
      name: op.name,
      duration: op.duration,
      workCenter: op.workCenter,
      status: 'Pending',
    }));

    const moNumber = await generateMONumber();

    const order = new ManufacturingOrder({
      moNumber,
      product,
      quantity,
      bom: bomDetails._id,
      components,
      workOrders,
      status: 'Draft',
      createdBy: req.user._id,
      assignee: assignee || null,
      notes,
    });

    const savedMO = await order.save();
    
    const populated = await ManufacturingOrder.findById(savedMO._id)
      .populate('product', 'sku name')
      .populate('components.product', 'sku name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm MO (Draft -> Confirmed, reserves components)
// @route   POST /api/v1/manufacturing/mo/:id/confirm
// @access  Private/Admin, Business Owner, Manufacturing User, Inventory Manager
export const confirmManufacturingOrder = async (req, res, next) => {
  try {
    const order = await ManufacturingOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Manufacturing Order not found');
    }

    if (order.status !== 'Draft') {
      res.status(400);
      throw new Error('Only Draft Manufacturing Orders can be confirmed');
    }

    // INTEGRATION: Reserve Component Materials in Stock
    for (const comp of order.components) {
      const product = await Product.findById(comp.product);
      if (product) {
        product.reserved += comp.quantityRequired;
        product.freeToUse -= comp.quantityRequired;
        await product.save();
      }
    }

    order.status = 'Confirmed';
    order.confirmedAt = new Date();
    const savedOrder = await order.save();

    res.json(savedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Start Work Order inside MO
// @route   POST /api/v1/manufacturing/mo/:id/work-order/:woId/start
// @access  Private/Admin, Manufacturing User
export const startWorkOrder = async (req, res, next) => {
  try {
    const order = await ManufacturingOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Manufacturing Order not found');
    }

    if (order.status !== 'Confirmed' && order.status !== 'In Progress') {
      res.status(400);
      throw new Error('Cannot start work orders for orders in status: ' + order.status);
    }

    const wo = order.workOrders.id(req.params.woId);
    if (!wo) {
      res.status(404);
      throw new Error('Work Order not found');
    }

    if (wo.status !== 'Pending') {
      res.status(400);
      throw new Error('Work Order is already ' + wo.status);
    }

    // Set statuses
    wo.status = 'In Progress';
    wo.startedAt = new Date();

    if (order.status === 'Confirmed') {
      order.status = 'In Progress';
      order.startedAt = new Date();
    }

    const savedOrder = await order.save();
    res.json(savedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Work Order inside MO (Deducts components and creates finished product if all WO complete)
// @route   POST /api/v1/manufacturing/mo/:id/work-order/:woId/complete
// @access  Private/Admin, Manufacturing User
export const completeWorkOrder = async (req, res, next) => {
  try {
    const order = await ManufacturingOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Manufacturing Order not found');
    }

    const wo = order.workOrders.id(req.params.woId);
    if (!wo) {
      res.status(404);
      throw new Error('Work Order not found');
    }

    if (wo.status !== 'In Progress') {
      res.status(400);
      throw new Error('Work Order must be In Progress to be completed');
    }

    wo.status = 'Completed';
    wo.completedAt = new Date();
    wo.completedBy = req.user._id;

    // Check if ALL work orders are now completed
    const allCompleted = order.workOrders.every((w) => w.status === 'Completed');

    if (allCompleted) {
      // 1. Consume raw components (Release Reservation physically, Log in StockLedger)
      for (const comp of order.components) {
        const product = await Product.findById(comp.product);
        if (product) {
          const prevOnHand = product.freeToUse + product.reserved;
          product.reserved = Math.max(0, product.reserved - comp.quantityRequired); // Release reservation
          // freeToUse is unchanged because they were already reserved (deducted from freeToUse upon confirmation)
          comp.quantityConsumed = comp.quantityRequired;
          await product.save();

          // Log component consumption in Stock Ledger
          await StockLedger.create({
            product: product._id,
            quantityChange: -comp.quantityRequired,
            prevOnHand,
            newOnHand: product.freeToUse + product.reserved,
            transactionType: 'Manufacturing Consumption',
            referenceId: order.moNumber,
            performedBy: req.user._id,
            notes: `Consumed as components for manufacturing order ${order.moNumber}`,
          });
        }
      }

      // 2. Produce finished product (Add to freeToUse, Log in StockLedger)
      const finishedProduct = await Product.findById(order.product);
      if (finishedProduct) {
        const prevOnHand = finishedProduct.freeToUse + finishedProduct.reserved;
        finishedProduct.freeToUse += order.quantity;
        await finishedProduct.save();

        // Log finished product production in Stock Ledger
        await StockLedger.create({
          product: finishedProduct._id,
          quantityChange: order.quantity,
          prevOnHand,
          newOnHand: finishedProduct.freeToUse + finishedProduct.reserved,
          transactionType: 'Manufacturing Production',
          referenceId: order.moNumber,
          performedBy: req.user._id,
          notes: `Produced finished goods via manufacturing order ${order.moNumber}`,
        });
      }

      order.status = 'Completed';
      order.completedAt = new Date();
    }

    const savedOrder = await order.save();
    
    // Return populated order
    const populated = await ManufacturingOrder.findById(savedOrder._id)
      .populate('product', 'sku name freeToUse reserved')
      .populate('components.product', 'sku name freeToUse reserved');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Manufacturing Order
// @route   POST /api/v1/manufacturing/mo/:id/cancel
// @access  Private/Admin, Business Owner, Manufacturing User
export const cancelManufacturingOrder = async (req, res, next) => {
  try {
    const order = await ManufacturingOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Manufacturing Order not found');
    }

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      res.status(400);
      throw new Error(`Cannot cancel manufacturing order in status: ${order.status}`);
    }

    // Release component reservations if the order was Confirmed or In Progress
    if (order.status === 'Confirmed' || order.status === 'In Progress') {
      for (const comp of order.components) {
        const product = await Product.findById(comp.product);
        if (product) {
          product.reserved = Math.max(0, product.reserved - comp.quantityRequired);
          product.freeToUse += comp.quantityRequired;
          await product.save();
        }
      }
    }

    order.status = 'Cancelled';
    const savedOrder = await order.save();
    res.json(savedOrder);
  } catch (error) {
    next(error);
  }
};
