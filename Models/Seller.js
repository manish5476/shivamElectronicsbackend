const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  gstin: {
    type: String,
    required: true,
    match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  },
  pan: {
    type: String,
    required: true,
    match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  },
  contactNumber: { type: String }
});

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;
