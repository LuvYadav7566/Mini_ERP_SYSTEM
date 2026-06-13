import mongoose from 'mongoose';

const bomComponentSchema = new mongoose.Schema({
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
});

const bomOperationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1, // duration in minutes
  },
  workCenter: {
    type: String,
    required: true,
    trim: true,
  },
});

const bomSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true, // Only one active BoM recipe per finished good
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  components: [bomComponentSchema],
  operations: [bomOperationSchema],
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const BoM = mongoose.model('BoM', bomSchema);
export default BoM;
