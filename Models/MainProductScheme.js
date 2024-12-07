const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  description: { type: String },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  altText: { type: String },
});

// Updated variantSchema to allow multiple images
const variantImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  altText: { type: String },
});

const variantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  images: [variantImageSchema], // Changed to an array of images
  stock: { type: Number, required: true },
});

const featureSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const warrantySchema = new mongoose.Schema({
  period: { type: String, required: true },
  details: { type: String, required: true },
});

const shippingOptionSchema = new mongoose.Schema({
  method: { type: String, required: true },
  cost: { type: Number, required: true },
  estimatedDelivery: { type: String, required: true },
});

const reviewResponseSchema = new mongoose.Schema({
  adminId: { type: String },
  response: { type: String },
  date: { type: Date },
});

// const reviewSchema = new mongoose.Schema({
//   reviewId: { type: String, required: true },
//   userId: { type: String, required: true },
//   rating: { type: Number, required: true },
//   comment: { type: String, required: true },
//   date: { type: Date, required: true },
//   helpfulCount: { type: Number, default: 0 },
//   responses: [reviewResponseSchema]
// });

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: {
    text: { type: String, required: true },
    images: [imageSchema],
    video: videoSchema,
  },
  category: {
    main: { type: String, required: true },
    sub: { type: String, required: true },
    subCategories: [{ type: String }],
  },
  brand: {
    name: { type: String, required: true },
    logo: { type: String, required: true },
    website: { type: String },
    established: { type: String },
    country: { type: String },
  },
  price: {
    current: { type: Number, required: true },
    original: { type: Number, required: true },
    currency: { type: String, required: true },
    discount: {
      percentage: { type: Number },
      expiresOn: { type: Date },
    },
    financingOptions: [
      {
        term: { type: String },
        monthlyPayment: { type: Number },
        interestRate: { type: String },
      },
    ],
  },
  stock: {
    quantity: { type: Number, required: true },
    status: { type: String, required: true },
    restockDate: { type: Date },
    warehouseLocation: { type: String },
  },
  images: {
    default: { type: String, required: true },
    variants: [variantSchema],
    "360View": { type: String },
  },
  specifications: {
    dimensions: {
      width: { type: String, required: true },
      height: { type: String, required: true },
      depth: { type: String, required: true },
    },
    weight: { type: String, required: true },
    energyRating: { type: String, required: true },
    features: [featureSchema],
    warranty: warrantySchema,
    materials: [{ type: String }],
    usageInstructions: { type: String },
    safetyWarnings: [{ type: String }],
  },
  metadata: {
    sku: { type: String, required: true },
    tags: [{ type: String }],
    releaseDate: { type: Date },
    timestamps: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
    relatedProducts: [
      {
        productId: { type: String },
        name: { type: String },
      },
    ],
  },
  shipping: {
    weight: { type: String, required: true },
    dimensions: {
      width: { type: String, required: true },
      height: { type: String, required: true },
      depth: { type: String, required: true },
    },
    options: [shippingOptionSchema],
    handlingInstructions: { type: String },
  },
  reviews: [reviewSchema],
});

// Create the model from the schema
const Product = mongoose.model("Product", productSchema);

module.exports = Product;

// const mongoose = require('mongoose');

// const videoSchema = new mongoose.Schema({
//   url: { type: String, required: true },
//   description: { type: String }
// });

// const imageSchema = new mongoose.Schema({
//   url: { type: String, required: true },
//   altText: { type: String }
// });

// // Updated variantSchema to allow multiple images
// const variantImageSchema = new mongoose.Schema({
//   imageUrl: { type: String, required: true },
//   altText: { type: String }
// });

// const variantSchema = new mongoose.Schema({
//   color: { type: String, required: true },
//   images: [variantImageSchema], // Changed to an array of images
//   stock: { type: Number, required: true }
// });

// const featureSchema = new mongoose.Schema({
//   text: { type: String, required: true },
// });

// const warrantySchema = new mongoose.Schema({
//   period: { type: String, required: true },
//   details: { type: String, required: true }
// });

// const shippingOptionSchema = new mongoose.Schema({
//   method: { type: String, required: true },
//   cost: { type: Number, required: true },
//   estimatedDelivery: { type: String, required: true }
// });

// const reviewResponseSchema = new mongoose.Schema({
//   adminId: { type: String },
//   response: { type: String },
//   date: { type: Date }
// });

// const reviewSchema = new mongoose.Schema({
//   reviewId: { type: String, required: true },
//   userId: { type: String, required: true },
//   rating: { type: Number, required: true },
//   comment: { type: String, required: true },
//   date: { type: Date, required: true },
//   helpfulCount: { type: Number, default: 0 },
//   responses: [reviewResponseSchema]
// });

// const productSchema = new mongoose.Schema({
//   productId: { type: String, required: true, unique: true },
//   name: { type: String, required: true },
//   description: {
//     text: { type: String, required: true },
//     images: [imageSchema],
//     video: videoSchema
//   },
//   category: {
//     main: { type: String, required: true },
//     sub: { type: String, required: true },
//     subCategories: [{ type: String }]
//   },
//   brand: {
//     name: { type: String, required: true },
//     logo: { type: String, required: true },
//     website: { type: String },
//     established: { type: String },
//     country: { type: String }
//   },
//   price: {
//     current: { type: Number, required: true },
//     original: { type: Number, required: true },
//     currency: { type: String, required: true },
//     discount: {
//       percentage: { type: Number },
//       expiresOn: { type: Date }
//     },
//     financingOptions: [{
//       term: { type: String },
//       monthlyPayment: { type: Number },
//       interestRate: { type: String }
//     }]
//   },
//   stock: {
//     quantity: { type: Number, required: true },
//     status: { type: String, required: true },
//     restockDate: { type: Date },
//     warehouseLocation: { type: String }
//   },
//   images: {
//     default: { type: String, required: true },
//     variants: [variantSchema],
//     "360View": { type: String }
//   },
//   specifications: {
//     dimensions: {
//       width: { type: String, required: true },
//       height: { type: String, required: true },
//       depth: { type: String, required: true }
//     },
//     weight: { type: String, required: true },
//     energyRating: { type: String, required: true },
//     features: [featureSchema],
//     warranty: warrantySchema,
//     materials: [{ type: String }],
//     usageInstructions: { type: String },
//     safetyWarnings: [{ type: String }]
//   },
//   metadata: {
//     sku: { type: String, required: true },
//     tags: [{ type: String }],
//     releaseDate: { type: Date },
//     timestamps: {
//       createdAt: { type: Date, default: Date.now },
//       updatedAt: { type: Date, default: Date.now }
//     },
//     relatedProducts: [{
//       productId: { type: String },
//       name: { type: String }
//     }]
//   },
//   shipping: {
//     weight: { type: String, required: true },
//     dimensions: {
//       width: { type: String, required: true },
//       height: { type: String, required: true },
//       depth: { type: String, required: true }
//     },
//     options: [shippingOptionSchema],
//     handlingInstructions: { type: String }
//   },
//   reviews: [reviewSchema]
// });

// // Create the model from the schema
// const Product = mongoose.model('Product', productSchema);

// module.exports = Product;
