const mongoose = require("mongoose");
const Product = require("./productModel");
const User = require("./UserModel");

const ReviewSchema = new mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: [true, "A review must be given by User."],
    },
    Product: {
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

module.exports = mongoose.model("Review", ReviewSchema);
// reviewerName: { type: String, required: true },
// reviewerEmail: { type: String, required: true },
