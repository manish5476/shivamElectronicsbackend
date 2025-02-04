const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Seller name is required'],
    trim: true
  },
  shopname: { 
    type: String, 
    required: [true, 'Shop name is required'],
    trim: true
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'],
    trim: true
  },
  gstin: { 
    type: String, 
    required: [true, 'GSTIN is required'],
    match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
  },
  pan: { 
    type: String, 
    required: [true, 'PAN is required'],
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
  },
  contactNumber: { 
    type: String,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number']
  }
}, { timestamps: true });

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;