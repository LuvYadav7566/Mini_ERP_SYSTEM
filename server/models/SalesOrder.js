import mongoose from 'mongoose';

const soItemSchema = new mongoose.Schema({
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
  salesPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantityDelivered: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const salesOrderSchema = new mongoose.Schema({
  soNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  items: [soItemSchema],
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Confirmed', 'Partially Delivered', 'Fully Delivered', 'Cancelled', 'Fully Deliverable', 'Partially Deliverable', 'Waiting for Stock'],
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
  confirmedAt: Date,
  completedAt: Date,
  allowPartialDelivery: {
    type: Boolean,
    default: true,
  },
  availableQuantity: {
    type: Number,
    default: 0,
  },
  shortageQuantity: {
    type: Number,
    default: 0,
  },
  pendingQuantity: {
    type: Number,
    default: 0,
  },
  expectedDeliveryDate: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
export default SalesOrder;
