const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./UserModel')

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  category: { type: String, required: [true, 'Category is required'], trim: true },
  tags: [{ type: String, trim: true }],
  brand: { type: String, required: [true, 'Brand is required'], trim: true },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  thumbnail: { type: String, required: [true, 'Thumbnail image is required'] },
  rate: {
    type: Number,
    required: [true, 'Base rate/price is required'],
    min: [0, 'Rate cannot be negative'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  gstRate: {
    type: Number,
    default: 18,
    min: [0, 'GST rate cannot be negative'],
    max: [100, 'GST rate cannot exceed 100%'],
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  stock: {
    type: Number,
    required: [true, 'Please enter product stock'],
    max: [9999, 'Stock cannot exceed 9999'],
    default: 1,
  },
  availabilityStatus: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    required: [true, 'Availability status is required'],
    default: 'In Stock',
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
});

productSchema.index({ price: 1 });
productSchema.virtual('finalPrice').get(function () {
  const priceAfterTax = this.price;
  const discountAmount = (priceAfterTax * this.discountPercentage) / 100;
  return priceAfterTax - discountAmount;
});


productSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true });
  }
  if (this.isModified('rate') || this.isNew || this.isModified('gstRate')) {
    const taxableValue = this.rate;
    const gstAmount = (taxableValue * this.gstRate) / 100;
    this.price = taxableValue + gstAmount;
  }
  next();
});

productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
