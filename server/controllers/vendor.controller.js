import Vendor from '../models/Vendor.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc    Get all vendors
// @route   GET /api/v1/vendors
// @access  Private
export const getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({}).sort({ name: 1 });
    res.json(vendors);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new vendor
// @route   POST /api/v1/vendors
// @access  Private/Admin, Business Owner, Purchase User
export const createVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, notes } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Vendor name is required');
    }

    const vendorExists = await Vendor.findOne({ name: name.trim() });
    if (vendorExists) {
      res.status(400);
      throw new Error(`Vendor with name '${name}' already exists`);
    }

    const vendor = await Vendor.create({
      name: name.trim(),
      contactPerson,
      email,
      phone,
      address,
      notes,
    });

    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a vendor
// @route   PUT /api/v1/vendors/:id
// @access  Private/Admin, Business Owner, Purchase User
export const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      res.status(404);
      throw new Error('Vendor not found');
    }

    const { name, contactPerson, email, phone, address, notes } = req.body;

    if (name && name.trim() !== vendor.name) {
      const vendorExists = await Vendor.findOne({ name: name.trim() });
      if (vendorExists) {
        res.status(400);
        throw new Error(`Vendor with name '${name}' already exists`);
      }
      vendor.name = name.trim();
    }

    if (contactPerson !== undefined) vendor.contactPerson = contactPerson;
    if (email !== undefined) vendor.email = email;
    if (phone !== undefined) vendor.phone = phone;
    if (address !== undefined) vendor.address = address;
    if (notes !== undefined) vendor.notes = notes;

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a vendor
// @route   DELETE /api/v1/vendors/:id
// @access  Private/Admin, Business Owner
export const deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      res.status(404);
      throw new Error('Vendor not found');
    }

    // Check if vendor has purchase orders referencing them
    const hasOrders = await PurchaseOrder.findOne({ vendor: req.params.id });
    if (hasOrders) {
      res.status(400);
      throw new Error('Cannot delete vendor because they have active or past Purchase Orders');
    }

    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    next(error);
  }
};
