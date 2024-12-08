const mongoose = require("mongoose");
const Product = require("./productModel");
const User = require("./UserModel");
const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: [true, "A review must be given by User."],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      require: [true, "A review must belong to Product."],
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    userreview: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//

ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

ReviewSchema.statics.calAverageRating = async function (productId) {
  try {
    const stats = await this.aggregate([
      { $match: { product: productId } },
      {
        $group: {
          _id: "$product",
          nRating: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const Product = require("./productModel");
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        ratingAverage: stats[0].avgRating,
        ratingQuantity: stats[0].nRating,
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        ratingQuantity: 0,
        ratingAverage: 4.5,
      });
    }
  } catch (err) {
    console.error("Error calculating average rating:", err);
  }
};

ReviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name email",
  });
  next();
});
//
ReviewSchema.post("save", async function (doc) {
  try {
    await mongoose.model("Review").calAverageRating(doc.product);
  } catch (err) {
    console.error("Error in post-save hook:", err);
  }
});
//
ReviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

ReviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calAverageRating(this.r.product);
  }
});

module.exports = mongoose.model("Review", ReviewSchema);
// ReviewSchema.statics.calAverageRating = async function (productId) {
//   try {
//     const stats = await this.aggregate([
//       { $match: { product: productId } },
//       {
//         $group: {
//           _id: "$product",
//           nRating: { $sum: 1 },
//           avgRating: { $avg: "$rating" },
//         },
//       },
//     ]);

//     if (stats.length > 0) {
//       await Product.findByIdAndUpdate(productId, {
//         ratingAverage: stats[0].avgRating,
//         ratingQuantity: stats[0].nRating,
//       });
//     } else {
//       await Product.findByIdAndUpdate(productId, {
//         ratingQuantity: 0,
//         ratingAverage: 4.5,
//       });
//     }
//   } catch (err) {
//     console.error("Error calculating average rating:", err);
//   }
// };

//
