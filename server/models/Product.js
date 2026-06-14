import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Raw Material', 'Finished Good', 'Component', 'Other'],
    default: 'Component',
  },
  salesPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  freeToUse: {
    type: Number,
    required: true,
    default: 0,
  },
  reserved: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  procurementStrategy: {
    type: String,
    required: true,
    enum: ['MTS', 'MTO'],
    default: 'MTS',
  },
  procureOnDemand: {
    type: Boolean,
    required: true,
    default: false,
  },
  procurementType: {
    type: String,
    enum: ['Purchase', 'Manufacturing'],
    default: 'Purchase',
  },
  vendor: {
    type: String, // Can be simple text vendor name or linked to Vendor Model in Phase 2
    default: '',
  },
  bom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BoM', // Linked to BoM Model in Phase 3
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual field for onHand quantity: On Hand = Free To Use + Reserved
productSchema.virtual('onHand')
  .get(function () {
    return this.freeToUse + this.reserved;
  })
  .set(function (value) {
    const reservedVal = this.reserved || 0;
    this.freeToUse = value - reservedVal;
  });

const Product = mongoose.model('Product', productSchema);
export default Product;
