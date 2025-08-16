const mongoose = require('mongoose');
const Product = require('./productModel');

const reviewSchema = new mongoose.Schema({
  // REFACTOR: The 'user' field correctly identifies who wrote the review.
  // The redundant 'owner' field has been removed.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A review must belong to a user'],
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'A review must belong to a product'],
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: true,
  },
  userreview: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
  },
}, {
  timestamps: true, // Use timestamps option for createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Ensures a user can only write one review per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Populate user and product details on find queries
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  });
  next();
});

/**
 * Static method to calculate the average rating for a given product
 * and update the product document.
 * @param {string} productId - The ID of the product to update.
 */
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const updateData = stats.length > 0
    ? { ratingAverage: stats[0].avgRating.toFixed(1), ratingQuantity: stats[0].nRating }
    : { ratingAverage: 0, ratingQuantity: 0 };

  await Product.findByIdAndUpdate(productId, updateData);
};


reviewSchema.post('save', function () {
  // 'this.constructor' refers to the Review model
  this.constructor.calcAverageRating(this.product);
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;


// const mongoose = require('mongoose');
// const Product = require('./productModel');
// const User = require('./UserModel')

// const reviewSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: [true, 'A review must be given by a User'],
//   },
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User', // Assumes you have a 'User' model
//     required: true // Every customer must belong to a user
//   },
//   product: {
//     type: mongoose.Schema.Types.ObjectId, // Corrected from ObjectId to Types.ObjectId
//     ref: 'Product',
//     required: [true, 'A review must belong to a Product'],
//   },
//   rating: {
//     type: Number,
//     min: [1, 'Rating must be at least 1'],
//     max: [5, 'Rating cannot exceed 5'],
//     required: true
//   },
//   userreview: {
//     type: String,
//     required: [true, 'Review text is required'],
//     trim: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
// }, {
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true },
// });

// // Unique index to prevent duplicate reviews per user-product pair
// reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// // Static method to calculate average rating with transaction
// reviewSchema.statics.calcAverageRating = async function (productId, session = null) {
//   const options = session ? { session } : {};
//   const stats = await this.aggregate([
//     { $match: { product: productId } },
//     {
//       $group: {
//         _id: '$product',
//         nRating: { $sum: 1 },
//         avgRating: { $avg: '$rating' },
//       },
//     },
//   ]);

//   const updateData = stats.length > 0
//     ? { ratingAverage: stats[0].avgRating, ratingQuantity: stats[0].nRating }
//     : { ratingAverage: 0, ratingQuantity: 0 };

//   await Product.findByIdAndUpdate(productId, updateData, options);
// };

// // Populate user data
// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'user',
//     select: 'name email',
//   }).populate({
//     path: 'product',
//     select: 'title',
//   });
//   next();
// });

// // Post-save hook with transaction
// reviewSchema.post('save', async function (doc) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     await this.constructor.calcAverageRating(doc.product, session);
//     await session.commitTransaction();
//   } catch (error) {
//     await session.abortTransaction();
//     throw new mongoose.Error(`Failed to update product ratings: ${error.message}`);
//   } finally {
//     session.endSession();
//   }
// });


// // Pre-findOneAnd hook to store the document
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   this.r = await this.findOne();
//   next();
// });

// // Post-findOneAnd hook with transaction
// reviewSchema.post(/^findOneAnd/, async function () {
//   if (this.r) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       await this.r.constructor.calcAverageRating(this.r.product, session);
//       await session.commitTransaction();
//     } catch (error) {
//       await session.abortTransaction();
//       throw new mongoose.Error(`Failed to update product ratings: ${error.message}`);
//     } finally {
//       session.endSession();
//     }
//   }
// });

// const Review = mongoose.model('Review', reviewSchema);
// module.exports = Review;
