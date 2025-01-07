const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require("./UserModel");
const Review = require("./ReviewModel");
const Product = require("./productModel");

// Define the Cart Item Schema (for internal use)
const cartItemSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Reference to the Product collection
    required: true
  },
  invoiceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice' 
  }]
});

// Define the Customer Schema
const customerSchema = new Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
    default: 'pending'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/ // Email validation
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  birthDate: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer not to say'],
    required: true
  },
  phoneNumbers: [{
    number: { type: String, required: true },
    type: { type: String, enum: ['home', 'mobile', 'work'], required: true },
    primary: { type: Boolean, default: false }
  }],
  addresses: [{
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address'
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], required: true },
    isDefault: { type: Boolean, default: false }
  }],
  preferences: {
    marketingEmails: { type: Boolean, default: true },
    communicationLanguage: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' },
    newsletterSubscription: { type: Boolean, default: false },
    productNotifications: { type: Boolean, default: true }
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order' // Reference to the Order collection
  }],
  cart: {
    items: [cartItemSchema]
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed // Allows any type of additional metadata
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;


// const customerSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   mobileNumber: {
//     type: String,
//     required: true,
//     match: /^[6-9]\d{9}$/, // Indian mobile number validation
//   },
//   address: {
//     street: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     postalCode: { type: String, required: true },
//     country: { type: String, default: "India" },
//   },
//   location: {
//     type: {
//       type: String,
//       enum: ["Point"], // Only 'Point' type is supported for GeoJSON
//       default: "Point",
//     },
//     coordinates: {
//       type: [Number], // [longitude, latitude]
//       required: true,
//     },
//   },
//   purchaseHistory: [
//     {
//       product: {
//         type: mongoose.Schema.ObjectId,
//         ref: "Product",
//       },
//       quantity: { type: Number, required: true },
//       purchaseDate: { type: Date, default: Date.now },
//       invoice: {
//         type: mongoose.Schema.ObjectId,
//         ref: "Invoice",
//       },
//     },
//   ],
//   emiDetails: {
//     guarantor: {
//       type: mongoose.Schema.ObjectId,
//       ref: "User",
//     },
//     totalPrice: { type: Number, required: true },
//     paidPrice: { type: Number, default: 0 },
//     remainingPrice: { type: Number, required: true },
//     paymentHistory: [
//       {
//         paymentDate: { type: Date, default: Date.now },
//         amountPaid: { type: Number, required: true },
//       },
//     ],
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Geospatial index for querying location
// customerSchema.index({ location: "2dsphere" });

// module.exports = mongoose.model("Customer", customerSchema);
