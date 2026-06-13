import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import Vendor from '../models/Vendor.js';
import BoM from '../models/BoM.js';

// Helper: Generate SO Number (SO-YYYY-0001)
const generateSONumber = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const count = await SalesOrder.countDocuments({
    createdAt: { $gte: startOfYear, $lte: endOfYear }
  });

  return `SO-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Get all sales orders
// @route   GET /api/v1/sales
// @access  Private
export const getSalesOrders = async (req, res, next) => {
  try {
    const orders = await SalesOrder.find({})
      .populate('createdBy', 'username role')
      .populate('items.product', 'sku name category salesPrice')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales order by ID
// @route   GET /api/v1/sales/:id
// @access  Private
export const getSalesOrderById = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('createdBy', 'username role')
      .populate('items.product', 'sku name category salesPrice freeToUse reserved');

    if (!order) {
      res.status(404);
      throw new Error('Sales Order not found');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new sales order (Draft)
// @route   POST /api/v1/sales
// @access  Private/Admin, Business Owner, Sales User
export const createSalesOrder = async (req, res, next) => {
  try {
    const { customerName, items, notes } = req.body;

    if (!customerName || !items || items.length === 0) {
      res.status(400);
      throw new Error('Customer Name and at least one item are required');
    }

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

      const salesPrice = parseFloat(item.salesPrice) >= 0 ? parseFloat(item.salesPrice) : product.salesPrice;
      totalAmount += quantity * salesPrice;

      orderItems.push({
        product: product._id,
        quantity,
        salesPrice,
        quantityDelivered: 0,
      });
    }

    const soNumber = await generateSONumber();

    const order = new SalesOrder({
      soNumber,
      customerName: customerName.trim(),
      items: orderItems,
      totalAmount,
      notes,
      createdBy: req.user._id,
      status: 'Draft',
    });

    const savedOrder = await order.save();
    
    const populated = await SalesOrder.findById(savedOrder._id)
      .populate('items.product', 'sku name');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a sales order (Draft only)
// @route   PUT /api/v1/sales/:id
// @access  Private/Admin, Business Owner, Sales User
export const updateSalesOrder = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Sales Order not found');
    }

    if (order.status !== 'Draft') {
      res.status(400);
      throw new Error('Only Draft Sales Orders can be updated');
    }

    const { customerName, items, notes } = req.body;

    if (customerName) order.customerName = customerName.trim();
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

        const salesPrice = parseFloat(item.salesPrice) >= 0 ? parseFloat(item.salesPrice) : product.salesPrice;
        totalAmount += quantity * salesPrice;

        orderItems.push({
          product: product._id,
          quantity,
          salesPrice,
          quantityDelivered: 0,
        });
      }
      order.items = orderItems;
      order.totalAmount = totalAmount;
    }

    const updatedOrder = await order.save();
    const populated = await SalesOrder.findById(updatedOrder._id)
      .populate('items.product', 'sku name');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Sales Order & Trigger MTS/MTO Procurement Automation
// @route   POST /api/v1/sales/:id/confirm
// @access  Private/Admin, Business Owner, Sales User
export const confirmSalesOrder = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Sales Order not found');
    }

    if (order.status !== 'Draft') {
      res.status(400);
      throw new Error('Only Draft Sales Orders can be confirmed');
    }

    // Process reservations and trigger procurement automation
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      // Reserve quantities (deduct from freeToUse and add to reserved)
      const freeToUseBefore = product.freeToUse;
      product.reserved += item.quantity;
      product.freeToUse -= item.quantity;
      await product.save();

      // MTO/MTS Shortage Check
      // Shortage is when the demand (item.quantity) exceeds the available free stock (freeToUseBefore).
      const shortage = item.quantity - freeToUseBefore;

      const needsProcurement = true; // Auto-procure on any shortage to keep departments in sync

      if (shortage > 0 && needsProcurement) {
        console.log(`[ERP Automation] Shortage of ${shortage} units detected for ${product.name} [Strategy: ${product.procurementStrategy}]`);
        
        if (product.procurementType === 'Purchase') {
          // --- AUTOMATIC PURCHASE ORDER GENERATION ---
          // Resolve Vendor ID
          let vendorId = null;
          if (product.vendor) {
            const matchedVendor = await Vendor.findOne({ name: new RegExp(`^${product.vendor.trim()}$`, 'i') });
            if (matchedVendor) {
              vendorId = matchedVendor._id;
            }
          }
          
          if (!vendorId) {
            // Fallback: Use first vendor or throw warning (for safety, grab first available)
            const firstVendor = await Vendor.findOne({});
            if (firstVendor) {
              vendorId = firstVendor._id;
            } else {
              console.warn(`[ERP Automation] Cannot create auto-PO: No vendors exist in database.`);
              continue;
            }
          }

          const poYear = new Date().getFullYear();
          const startYear = new Date(poYear, 0, 1);
          const endYear = new Date(poYear, 11, 31, 23, 59, 59);
          const count = await PurchaseOrder.countDocuments({ createdAt: { $gte: startYear, $lte: endYear } });
          const poNumber = `PO-${poYear}-${String(count + 1).padStart(4, '0')}`;

          await PurchaseOrder.create({
            poNumber,
            vendor: vendorId,
            items: [
              {
                product: product._id,
                quantity: shortage,
                costPrice: product.costPrice,
                quantityReceived: 0,
              }
            ],
            totalAmount: shortage * product.costPrice,
            notes: `[AUTO-PROCUREMENT] Automatically generated from Sales Order ${order.soNumber} to fulfill MTO/Shortage demand.`,
            createdBy: req.user._id,
            status: 'Draft',
          });
          console.log(`[ERP Automation] Draft Purchase Order ${poNumber} generated successfully for ${shortage} units of ${product.sku}.`);

        } else if (product.procurementType === 'Manufacturing') {
          // --- AUTOMATIC MANUFACTURING ORDER GENERATION ---
          if (!product.bom) {
            console.warn(`[ERP Automation] Cannot create auto-MO: Product has no linked BoM recipe.`);
            continue;
          }

          const bomDetails = await BoM.findById(product.bom).populate('components.product');
          if (!bomDetails) continue;

          // Generate requirements
          const components = bomDetails.components.map((c) => ({
            product: c.product._id,
            quantityRequired: c.quantity * shortage,
            quantityConsumed: 0,
          }));

          const workOrders = bomDetails.operations.map((op) => ({
            name: op.name,
            duration: op.duration,
            workCenter: op.workCenter,
            status: 'Pending',
          }));

          const moYear = new Date().getFullYear();
          const startYear = new Date(moYear, 0, 1);
          const endYear = new Date(moYear, 11, 31, 23, 59, 59);
          const count = await ManufacturingOrder.countDocuments({ createdAt: { $gte: startYear, $lte: endYear } });
          const moNumber = `MO-${moYear}-${String(count + 1).padStart(4, '0')}`;

          await ManufacturingOrder.create({
            moNumber,
            product: product._id,
            quantity: shortage,
            bom: bomDetails._id,
            components,
            workOrders,
            status: 'Draft',
            createdBy: req.user._id,
            notes: `[AUTO-PROCUREMENT] Automatically generated from Sales Order ${order.soNumber} to fulfill MTO/Shortage production.`,
          });
          console.log(`[ERP Automation] Draft Manufacturing Order ${moNumber} generated successfully for ${shortage} units of ${product.sku}.`);
        }
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

// @desc    Deliver goods for confirmed/partially delivered sales orders
// @route   POST /api/v1/sales/:id/deliver
// @access  Private/Admin, Business Owner, Inventory Manager, Sales User
export const deliverSalesOrderGoods = async (req, res, next) => {
  try {
    const { itemsDelivered } = req.body; // Array of { product: ID, quantityDelivered: Number }

    if (!itemsDelivered || itemsDelivered.length === 0) {
      res.status(400);
      throw new Error('Please specify items and quantities to deliver');
    }

    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Sales Order not found');
    }

    if (order.status !== 'Confirmed' && order.status !== 'Partially Delivered') {
      res.status(400);
      throw new Error('Goods can only be delivered for Confirmed or Partially Delivered Sales Orders');
    }

    // Process each delivery item
    for (const itemDel of itemsDelivered) {
      const soItemIndex = order.items.findIndex(
        (i) => i.product.toString() === itemDel.product.toString()
      );

      if (soItemIndex === -1) {
        res.status(400);
        throw new Error(`Product ${itemDel.product} is not part of this Sales Order`);
      }

      const soItem = order.items[soItemIndex];
      const qtyDel = parseInt(itemDel.quantityDelivered);

      if (isNaN(qtyDel) || qtyDel <= 0) continue;

      const totalNewDelivered = soItem.quantityDelivered + qtyDel;
      if (totalNewDelivered > soItem.quantity) {
        res.status(400);
        throw new Error(
          `Cannot deliver ${qtyDel} units. Pushing total delivered (${totalNewDelivered}) past ordered quantity (${soItem.quantity})`
        );
      }

      const product = await Product.findById(soItem.product);
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }

      // STRICT PHYSICAL INVENTORY CHECK:
      const currentOnHand = product.freeToUse + product.reserved;
      if (currentOnHand < qtyDel) {
        res.status(400);
        throw new Error(
          `Insufficient physical stock on hand to deliver ${qtyDel} units of ${product.name}. Current On Hand: ${currentOnHand}`
        );
      }

      // Update SO item quantity delivered
      soItem.quantityDelivered = totalNewDelivered;

      // Update physical inventory (decrement reserved as they are dispatched)
      const prevOnHand = product.freeToUse + product.reserved;
      product.reserved = Math.max(0, product.reserved - qtyDel);
      // freeToUse is unchanged because they were already reserved (deducted from freeToUse upon confirmation)
      await product.save();

      // Log delivery in Stock Ledger
      await StockLedger.create({
        product: product._id,
        quantityChange: -qtyDel,
        prevOnHand,
        newOnHand: product.freeToUse + product.reserved,
        transactionType: 'Sales Delivery',
        referenceId: order.soNumber,
        performedBy: req.user._id,
        notes: `Delivered items to customer via Sales Order ${order.soNumber}`,
      });
    }

    // Determine final status
    let allFullyDelivered = true;
    let anyDelivered = false;

    for (const item of order.items) {
      if (item.quantityDelivered < item.quantity) {
        allFullyDelivered = false;
      }
      if (item.quantityDelivered > 0) {
        anyDelivered = true;
      }
    }

    if (allFullyDelivered) {
      order.status = 'Fully Delivered';
      order.completedAt = new Date();
    } else if (anyDelivered) {
      order.status = 'Partially Delivered';
    }

    const savedOrder = await order.save();

    const populated = await SalesOrder.findById(savedOrder._id)
      .populate('items.product', 'sku name category freeToUse reserved');

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a sales order
// @route   POST /api/v1/sales/:id/cancel
// @access  Private/Admin, Business Owner, Sales User
export const cancelSalesOrder = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Sales Order not found');
    }

    if (order.status === 'Partially Delivered' || order.status === 'Fully Delivered') {
      res.status(400);
      throw new Error('Cannot cancel Sales Orders after goods have been partially/fully delivered');
    }

    if (order.status === 'Cancelled') {
      res.status(400);
      throw new Error('Sales Order is already cancelled');
    }

    // Release reservations if Confirmed
    if (order.status === 'Confirmed') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.reserved = Math.max(0, product.reserved - item.quantity);
          product.freeToUse += item.quantity;
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
