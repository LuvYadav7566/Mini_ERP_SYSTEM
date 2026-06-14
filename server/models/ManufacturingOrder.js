import mongoose from 'mongoose';

const moComponentSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantityRequired: {
    type: Number,
    required: true,
    min: 1,
  },
  quantityConsumed: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const workOrderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  workCenter: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  startedAt: Date,
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const manufacturingOrderSchema = new mongoose.Schema({
  moNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
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
  bom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BoM',
    required: true,
  },
  components: [moComponentSchema],
  workOrders: [workOrderSchema],
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Draft',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  confirmedAt: Date,
  startedAt: Date,
  completedAt: Date,
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const ManufacturingOrder = mongoose.model('ManufacturingOrder', manufacturingOrderSchema);
export default ManufacturingOrder;
