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
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// in this the both tour nad user getting populated in review which we dont need that why we are using only review
// ReviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "user",
//     select: "name email", // Only fetch the required fields
//   }).populate({
//     path: "Product",
//     select: "title price",
//   });
//   next();
// });

ReviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name email", // Only fetch the required fields
  });
  next();
});
module.exports = mongoose.model("Review", ReviewSchema);
// reviewerName: { type: String, required: true },
// reviewerEmail: { type: String, required: true },
