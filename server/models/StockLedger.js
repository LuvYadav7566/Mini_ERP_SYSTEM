import mongoose from 'mongoose';

const stockLedgerSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantityChange: {
    type: Number,
    required: true,
  },
  prevOnHand: {
    type: Number,
    required: true,
    min: 0,
  },
  newOnHand: {
    type: Number,
    required: true,
    min: 0,
  },
  transactionType: {
    type: String,
    required: true,
    enum: [
      'Purchase Receipt',
      'Sales Delivery',
      'Manufacturing Consumption',
      'Manufacturing Production',
      'Inventory Adjustment',
      'System Initialization',
    ],
  },
  referenceId: {
    type: String,
    default: '',
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Stock ledger is immutable, only createdAt is needed
});

const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);
export default StockLedger;
