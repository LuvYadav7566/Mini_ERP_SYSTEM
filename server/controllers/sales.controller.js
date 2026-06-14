import SalesOrder from '../models/SalesOrder.js';
import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import Vendor from '../models/Vendor.js';
import BoM from '../models/BoM.js';
import AuditLog from '../models/AuditLog.js';

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
    const { customerName, items, notes, allowPartialDelivery, expectedDeliveryDate } = req.body;

    if (!customerName || !items || items.length === 0) {
      res.status(400);
      throw new Error('Customer Name and at least one item are required');
    }

    const orderItems = [];
    let totalAmount = 0;
    let totalAvailableQuantity = 0;
    let totalShortageQuantity = 0;

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

      const availableForThis = Math.max(0, Math.min(quantity, product.freeToUse));
      const shortageForThis = Math.max(0, quantity - product.freeToUse);

      totalAvailableQuantity += availableForThis;
      totalShortageQuantity += shortageForThis;

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
      allowPartialDelivery: allowPartialDelivery !== undefined ? allowPartialDelivery : true,
      expectedDeliveryDate: expectedDeliveryDate || null,
      availableQuantity: totalAvailableQuantity,
      shortageQuantity: totalShortageQuantity,
      pendingQuantity: 0,
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

    const { customerName, items, notes, allowPartialDelivery, expectedDeliveryDate } = req.body;

    if (customerName) order.customerName = customerName.trim();
    if (notes !== undefined) order.notes = notes;
    if (allowPartialDelivery !== undefined) order.allowPartialDelivery = allowPartialDelivery;
    if (expectedDeliveryDate !== undefined) order.expectedDeliveryDate = expectedDeliveryDate;

    if (items && items.length > 0) {
      const orderItems = [];
      let totalAmount = 0;
      let totalAvailableQuantity = 0;
      let totalShortageQuantity = 0;

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

        const availableForThis = Math.max(0, Math.min(quantity, product.freeToUse));
        const shortageForThis = Math.max(0, quantity - product.freeToUse);

        totalAvailableQuantity += availableForThis;
        totalShortageQuantity += shortageForThis;

        orderItems.push({
          product: product._id,
          quantity,
          salesPrice,
          quantityDelivered: 0,
        });
      }
      order.items = orderItems;
      order.totalAmount = totalAmount;
      order.availableQuantity = totalAvailableQuantity;
      order.shortageQuantity = totalShortageQuantity;
    } else {
      let totalAvailableQuantity = 0;
      let totalShortageQuantity = 0;
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const availableForThis = Math.max(0, Math.min(item.quantity, product.freeToUse));
          const shortageForThis = Math.max(0, item.quantity - product.freeToUse);
          totalAvailableQuantity += availableForThis;
          totalShortageQuantity += shortageForThis;
        }
      }
      order.availableQuantity = totalAvailableQuantity;
      order.shortageQuantity = totalShortageQuantity;
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

    let totalShortage = 0;
    let totalAvailable = 0;
    let totalQuantity = 0;
    const itemStockDetails = [];

    // Evaluate stock availability for all items
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      
      const freeToUseBefore = product.freeToUse;
      const availableForThis = Math.max(0, Math.min(item.quantity, freeToUseBefore));
      const shortageForThis = Math.max(0, item.quantity - freeToUseBefore);
      
      totalAvailable += availableForThis;
      totalShortage += shortageForThis;
      totalQuantity += item.quantity;

      itemStockDetails.push({
        item,
        product,
        availableForThis,
        shortageForThis,
      });
    }

    order.availableQuantity = totalAvailable;
    order.shortageQuantity = totalShortage;

    if (totalShortage === 0) {
      // ----------------------------------------------------
      // CASE 1: SUFFICIENT STOCK (FULLY DELIVERABLE)
      // ----------------------------------------------------
      for (const details of itemStockDetails) {
        details.product.reserved += details.item.quantity;
        details.product.freeToUse -= details.item.quantity;
        await details.product.save();
      }

      order.status = 'Fully Deliverable';
      order.pendingQuantity = 0;
      order.confirmedAt = new Date();
      const savedOrder = await order.save();

      // Log in AuditLog
      await AuditLog.create({
        action: 'Sales Order Confirmation',
        user: req.user._id,
        performedBy: req.user.username,
        details: `Confirmed Sales Order ${order.soNumber}. Status: Fully Deliverable. Stock is fully available.`,
      });

      return res.json(savedOrder);
    } else {
      // ----------------------------------------------------
      // CASE 2: STOCK SHORTAGE DETECTED
      // ----------------------------------------------------
      if (order.allowPartialDelivery) {
        // --- OPTION 1: ALLOW PARTIAL DELIVERY ---
        for (const details of itemStockDetails) {
          const product = details.product;
          const item = details.item;
          const availableQty = details.availableForThis;
          const shortageQty = details.shortageForThis;

          // Deliver available quantity immediately
          if (availableQty > 0) {
            item.quantityDelivered = availableQty;
            
            const prevOnHand = product.freeToUse + product.reserved;
            product.freeToUse -= availableQty;
            await product.save();

            // Log physical shipment dispatch in StockLedger
            await StockLedger.create({
              product: product._id,
              quantityChange: -availableQty,
              prevOnHand,
              newOnHand: product.freeToUse + product.reserved,
              transactionType: 'Sales Delivery',
              referenceId: order.soNumber,
              performedBy: req.user._id,
              notes: `Immediate partial delivery of ${availableQty} units for Sales Order ${order.soNumber}`,
            });
          }

          // Trigger automatic PO/MO for the shortage quantity
          if (shortageQty > 0) {
            await triggerProcurementForShortage(product, shortageQty, order.soNumber, req.user._id);
          }
        }

        order.status = 'Partially Deliverable';
        order.pendingQuantity = totalShortage;
        order.confirmedAt = new Date();
        const savedOrder = await order.save();

        // Log in AuditLog
        await AuditLog.create({
          action: 'Sales Order Confirmation',
          user: req.user._id,
          performedBy: req.user.username,
          details: `Confirmed Sales Order ${order.soNumber} with Partial Delivery. Shipped ${totalAvailable} units immediately. Shortage of ${totalShortage} units queued. Expected delivery: ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A'}.`,
        });

        return res.json(savedOrder);
      } else {
        // --- OPTION 2: REQUIRE FULL DELIVERY ---
        for (const details of itemStockDetails) {
          const product = details.product;
          const shortageQty = details.shortageForThis;

          // Do NOT reserve or deliver stock. Trigger PO/MO for the entire shortage.
          if (shortageQty > 0) {
            await triggerProcurementForShortage(product, shortageQty, order.soNumber, req.user._id);
          }
        }

        order.status = 'Waiting for Stock';
        order.pendingQuantity = totalQuantity;
        order.confirmedAt = new Date();
        const savedOrder = await order.save();

        // Log in AuditLog
        await AuditLog.create({
          action: 'Sales Order Confirmation',
          user: req.user._id,
          performedBy: req.user.username,
          details: `Confirmed Sales Order ${order.soNumber} requiring Full Delivery. Shortage of ${totalShortage} units detected. Order status set to Waiting for Stock.`,
        });

        return res.json(savedOrder);
      }
    }
  } catch (error) {
    next(error);
  }
};

// Helper: Trigger automated PO or MO for shortages
const triggerProcurementForShortage = async (product, shortage, soNumber, userId) => {
  if (product.procurementType === 'Purchase') {
    let vendorId = null;
    if (product.vendor) {
      const matchedVendor = await Vendor.findOne({ name: new RegExp(`^${product.vendor.trim()}$`, 'i') });
      if (matchedVendor) {
        vendorId = matchedVendor._id;
      }
    }
    
    if (!vendorId) {
      const firstVendor = await Vendor.findOne({});
      if (firstVendor) {
        vendorId = firstVendor._id;
      } else {
        console.warn(`[ERP Automation] Cannot create auto-PO: No vendors exist in database.`);
        return;
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
      notes: `[AUTO-PROCUREMENT] Automatically generated from Sales Order ${soNumber} to fulfill shortage demand.`,
      createdBy: userId,
      status: 'Draft',
    });
    console.log(`[ERP Automation] Draft Purchase Order ${poNumber} generated successfully for ${shortage} units of ${product.sku}.`);

  } else if (product.procurementType === 'Manufacturing') {
    if (!product.bom) {
      console.warn(`[ERP Automation] Cannot create auto-MO: Product has no linked BoM recipe.`);
      return;
    }

    const bomDetails = await BoM.findById(product.bom).populate('components.product');
    if (!bomDetails) return;

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
      createdBy: userId,
      notes: `[AUTO-PROCUREMENT] Automatically generated from Sales Order ${soNumber} to fulfill shortage production.`,
    });
    console.log(`[ERP Automation] Draft Manufacturing Order ${moNumber} generated successfully for ${shortage} units of ${product.sku}.`);
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

    const validStatuses = ['Confirmed', 'Partially Delivered', 'Fully Deliverable', 'Partially Deliverable', 'Waiting for Stock'];
    if (!validStatuses.includes(order.status)) {
      res.status(400);
      throw new Error('Goods can only be delivered for Confirmed, Fully Deliverable, or Partially Deliverable Sales Orders');
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

    // Release reservations if Confirmed or Fully Deliverable
    if (order.status === 'Confirmed' || order.status === 'Fully Deliverable') {
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
