const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./UserModel");
const Review = require("./ReviewModel");
const Product = require("./productModel");

// Define the Cart Item Schema (for internal use)
const cartItemSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  invoiceIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  ],
});

// Define the Customer Schema
const customerSchema = new Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // unique: true
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "suspended", "blocked"],
      default: "pending",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /.+\@.+\..+/, // Email validation
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer not to say"],
      required: true,
    },
    phoneNumbers: [
      {
        number: { type: String, required: true },
        type: {
          type: String,
          enum: ["home", "mobile", "work"],
          required: true,
        },
        primary: { type: Boolean, default: false },
      },
    ],
    addresses: [
      {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        type: {
          type: String,
          enum: ["billing", "shipping", "home", "work"],
          required: true,
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
    preferences: {
      marketingEmails: { type: Boolean, default: true },
      communicationLanguage: { type: String, default: "en" },
      currency: { type: String, default: "USD" },
      newsletterSubscription: { type: Boolean, default: false },
      productNotifications: { type: Boolean, default: true },
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    cart: {
      items: [cartItemSchema],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed, // Allows any type of additional metadata
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

customerSchema.pre(/^find/, function (next) {
  this.populate({
    path: "cart.items.productId", // Correct path to populate productId
    select: "-__v", // Optional: exclude specific fields from the populated data
  });
  next();
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
