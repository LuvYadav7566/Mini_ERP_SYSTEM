import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantityReceived: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  items: [poItemSchema],
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Confirmed', 'Partially Received', 'Fully Received', 'Cancelled'],
    default: 'Draft',
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  confirmedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
