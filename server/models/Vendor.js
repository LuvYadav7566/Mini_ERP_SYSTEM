import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
