const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
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
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
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

// Indexes
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 });

// Virtual for final price
productSchema.virtual('finalPrice').get(function () {
  const priceAfterTax = this.price;
  const discountAmount = (priceAfterTax * this.discountPercentage) / 100;
  return priceAfterTax - discountAmount;
});

// Middleware
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

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
// const mongoose = require("mongoose");
// const slugify = require("slugify");
// const Review = require('./ReviewModel')
// const productSchema = new mongoose.Schema(
//   {
//     // --- Basic Product Information ---
//     title: {
//       type: String,
//       required: [true, "Product title is required"],
//       trim: true,
//       maxlength: [200, "Title cannot exceed 200 characters"],
//     },
//     slug: {
//       type: String,
//       unique: true,
//       lowercase: true,
//       index: true,
//     },
//     description: {
//       type: String,
//       required: [true, "Description is required"],
//       trim: true,
//       maxlength: [500, "Description cannot exceed 500 characters"],
//     },
//     detailedDescriptions: [
//       {
//         _id: { type: mongoose.Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
//         detail: { type: String, required: [true, "Detail is required"] },
//       },
//     ],
//     category: {
//       type: String,
//       required: [true, "Category is required"],
//       trim: true,
//     },
//     tags: [{ type: String, trim: true }],
//     brand: {
//       type: String,
//       required: [true, "Brand is required"],
//       trim: true,
//     },
//     sku: {
//       type: String,
//       required: [true, "SKU (Stock Keeping Unit) is required"],
//       unique: true,
//       trim: true,
//       uppercase: true,
//       index: true,
//     },
//     thumbnail: { type: String, required: [true, "Thumbnail image is required"] },
//     images: [
//       {
//         _id: { type: mongoose.Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
//         detail: { type: String },
//         link: { type: String },
//       },
//     ],

//     // --- Pricing and GST ---
//     rate: {
//       type: Number,
//       required: [true, "Base rate/price is required"],
//       min: [0, "Rate cannot be negative"],
//     },
//     price: {
//       type: Number,
//       required: [true, "Price is required"],
//       min: [0, "Price cannot be negative"],
//     },
//     gstRate: {
//       type: Number,
//       default: 18,
//       min: [0, "GST rate cannot be negative"],
//       max: [100, "GST rate cannot exceed 100%"],
//     },
//     discountPercentage: {
//       type: Number,
//       default: 0,
//       min: [0, "Discount cannot be negative"],
//       max: [100, "Discount cannot exceed 100%"],
//     },
//     stock: {
//       type: Number,
//       required: [true, "Stock quantity is required"],
//       min: [0, "Stock cannot be negative"],
//     },
//     availabilityStatus: {
//       type: String,
//       enum: ["In Stock", "Low Stock", "Out of Stock"],
//       required: [true, "Availability status is required"],
//       default: "In Stock",
//     },
//     minimumOrderQuantity: { type: Number, default: 1, min: [1, "Minimum order quantity must be at least 1"] },
//     weight: {
//       type: Number,
//       required: [true, "Weight is required"],
//       min: [0, "Weight cannot be negative"],
//     },
//     dimensions: {
//       width: { type: Number, required: [true, "Width is required"], min: [0, "Width cannot be negative"] },
//       height: { type: Number, required: [true, "Height is required"], min: [0, "Height cannot be negative"] },
//       depth: { type: Number, required: [true, "Depth is required"], min: [0, "Depth cannot be negative"] },
//     },

//     // --- Warranty and Shipping ---
//     warrantyInformation: {
//       type: String,
//       required: [true, "Warranty information is required"],
//       trim: true,
//     },
//     shippingInformation: {
//       type: String,
//       required: [true, "Shipping information is required"],
//       trim: true,
//     },
//     returnPolicy: {
//       type: String,
//       required: [true, "Return policy is required"],
//       trim: true,
//     },

//     // --- Ratings and Reviews ---
//     ratingAverage: { type: Number, min: 0, max: 5, default: 0, set: (v) => Math.round(v * 10) / 10 },
//     ratingQuantity: { type: Number, min: 0, default: 0 },

//     // --- Sales Person ---
//     salesPerson: [
//       {
//         type: String,
//       },
//     ],

//     // --- Metadata ---
//     meta: {
//       createdAt: { type: Date, default: Date.now },
//       updatedAt: { type: Date, default: Date.now },
//       barcode: {
//         type: String,
//         required: [true, "Barcode is required"],
//         unique: true,
//         trim: true,
//         index: true,
//       },
//       qrCode: { type: String }, // Optional - QR code for product
//     },
//   },
//   {
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//     timestamps: true,
//   }
// );

// // --- Indexes for Performance ---
// productSchema.index({ price: 1 }, { "reviews.rating": -1 });
// productSchema.index({ slug: 1 });
// productSchema.index({ startLocation: "2dsphere" });

// // --- Virtual Properties ---
// productSchema.virtual("finalPrice").get(function () {
//   const priceAfterTax = this.price; // 'this.price' is already the price after GST
//   const discountAmount = (priceAfterTax * this.discountPercentage) / 100;
//   return priceAfterTax - discountAmount;
// });

// productSchema.virtual("reviews", {
//   ref: "Review",
//   foreignField: "product",
//   localField: "_id",
// });

// // --- Middlewares ---
// productSchema.pre("save", function (next) {
//   if (this.isModified('title')) {
//     this.slug = slugify(this.title, { lower: true });
//   }
//   next();
// });

// productSchema.pre('save', function (next) {
//   if (this.isModified('rate') || this.isNew || this.isModified('gstRate')) {
//     const taxableValue = this.rate;
//     const gstAmount = (taxableValue * this.gstRate) / 100;
//     this.price = taxableValue + gstAmount;
//   }
//   next();
// });


// productSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "salesPerson",
//     select: "name email",
//   });
//   next();
// });

// const Product = mongoose.model("Product", productSchema);
// module.exports = Product;

// // const mongoose = require("mongoose");
// // const User = require("./UserModel");
// // const slugify = require("slugify");
// // const Review = require("./ReviewModel");
// // // Main Product Schema
// // const productSchema = new mongoose.Schema(
// //   {
// //     // productID:{type:String,unique:true,},
// //     title: { type: String, required: true, trim: true, maxlength: 200 },
// //     description: { type: String, required: true, trim: true, maxlength: 500 },
// //     detailedDescriptions: [
// //       {
// //         id: { type: String },
// //         detail: { type: String, required: true },
// //       },
// //     ],
// //     category: { type: String, required: true, trim: true },
// //     rate: { type: Number, required: true, min: 0 },
// //     cgst: { type: Number, required: true, min: 0 },
// //     sgst: { type: Number, required: true, min: 0 },
// //     price: { type: Number, required: true, min: 0 },
// //     discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
// //     ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
// //     ratingQuantity: { type: Number, min: 0 },
// //     stock: { type: Number, required: true, min: 0 },
// //     tags: [{ type: String, trim: true }],
// //     brand: { type: String, required: true, trim: true },
// //     sku: { type: String, required: true, unique: true, trim: true },
// //     weight: { type: Number, required: true, min: 0 },
// //     dimensions: {
// //       width: { type: Number, required: true },
// //       height: { type: Number, required: true },
// //       depth: { type: Number, required: true },
// //     },
// //     warrantyInformation: { type: String, required: true, trim: true },
// //     shippingInformation: { type: String, required: true, trim: true },
// //     availabilityStatus: {
// //       type: String,
// //       enum: ["In Stock", "Low Stock", "Out of Stock"],
// //       required: true,
// //     },
// //     // startLocation: {
// //     //   type: {
// //     //     type: String,
// //     //     default: "Point",
// //     //     enum: ["Point"],
// //     //   },
// //     //   coordinates: [Number],
// //     //   address: { type: String },
// //     //   description: { type: String },
// //     // },
// //     // locations: [
// //     //   {
// //     //     type: {
// //     //       type: String,
// //     //       default: "Point",
// //     //       enum: ["Point"],
// //     //     },
// //     //     coordinates: [Number],
// //     //     address: { type: String },
// //     //     description: { type: String },
// //     //     day: { type: Number },
// //     //   },
// //     // ],
// //     returnPolicy: { type: String, required: true, trim: true },
// //     minimumOrderQuantity: { type: Number, default: 1 },
// //     meta: {
// //       createdAt: { type: Date, default: Date.now },
// //       updatedAt: { type: Date, default: Date.now },
// //       barcode: { type: String, required: true, unique: true },
// //       qrCode: { type: String }, // Optional
// //     },
// //     images: [
// //       {
// //         id: { type: String, },
// //         detail: { type: String, required: false },
// //         link: { type: String, required: false },
// //       },
// //     ],
// //     thumbnail: { type: String, required: true },

// //     salesPerson: [
// //       {
// //         // type: mongoose.Schema.ObjectId,
// //         type: String,
// //         // ref: "User",
// //       },
// //     ],
// //   },
// //   {
// //     toJSON: { virtuals: true },
// //     toObject: { virtuals: true },
// //   },
// //   { timestamps: true }
// // );

// // // productSchema.index({ price: 1 });
// // productSchema.index({ price: 1 }, { "reviews.rating": -1 });
// // productSchema.index({ slug: 1 });
// // productSchema.index({ startLocation: "2dsphere" });

// // productSchema.set("toJSON", { virtuals: true });
// // productSchema.set("toObject", { virtuals: true });

// // productSchema.pre("save", function (next) {
// //   this.populate({
// //     path: "salesPerson",
// //     select: "-__v -createdAt", // Exclude the `__v` and `createdAt` fields from thr shalesperson key
// //   });
// //   next();
// // });

// // // productSchema.virtual("finalPrice").get(function () {
// // //   const discountedPrice = this.rate - (this.rate * this.discountPercentage) / 100;
// // //   const taxableValue = discountedPrice; // Assuming no additional taxes before CGST and SGST
// // //   const cgstAmount = (taxableValue * this.cgst) / 100;
// // //   const sgstAmount = (taxableValue * this.sgst) / 100;
// // //   const finalPrice = discountedPrice + cgstAmount + sgstAmount;
// // //   return finalPrice;
// // // });
// // // productSchema.virtual("finalPrice").get(function () {
// // //   const taxableValue = this.rate;
// // //   const cgstAmount = (taxableValue * this.cgst) / 100;
// // //   const sgstAmount = (taxableValue * this.sgst) / 100;
// // //   const priceWithTaxes = taxableValue + cgstAmount + sgstAmount;

// // //   const discountAmount = (priceWithTaxes * this.discountPercentage) / 100; // This will be 0
// // //   const finalPrice = priceWithTaxes - discountAmount; // Subtracting 0 doesn't change the value
// // //   return finalPrice;
// // // });
// // productSchema.virtual("finalPrice").get(function () {
// //   const taxableValue = this.rate;
// //   const cgstAmount = (taxableValue * this.cgst) / 100;
// //   const sgstAmount = (taxableValue * this.sgst) / 100;
// //   const totalTax = cgstAmount + sgstAmount;

// //   const discountedPrice = this.price - (this.price * this.discountPercentage) / 100;
// //   return discountedPrice + totalTax;
// // });


// // productSchema.pre(/^find/, function (next) {
// //   this.populate({
// //     path: "salesPerson",
// //     select: "name email",
// //   });
// //   next();
// // });

// // productSchema.virtual("finalPrice").get(function () {
// //   return this.price - (this.price * this.discountPercentage) / 100;
// // });

// // //two way virtual binding to get the data  virtuala populalte the data
// // productSchema.virtual("reviews", {
// //   ref: "Review", //here it is showing review model
// //   foreignField: "product", //here this field describr th key in Review
// //   localField: "_id",
// // });

// // productSchema.pre("save", function (next) {
// //   this.slug = slugify(this.title, { lower: true });
// //   next();
// // });

// // // productSchema.pre('save',async function(next){
// // //   const salesPersonpromise= this.salesPerson.map(async id=> await User.findById(id))
// // //   this.salesPerson=await promise.all(salesPersonpromise)
// // //   next()
// // // })

// // productSchema.post(/^find/, function (docs, next) {
// //   // console.log(docs);
// //   next();
// // });

// // const Product = mongoose.model("Product", productSchema);
// // module.exports = Product;














