const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    features: { type: Array },
    images: { type: Array },
    stock: { type: Number, required: true },
    ratings: { type: Number, default: 0 },
    reviews: [
      {
        user: { type: String },
        rating: { type: Number },
        comment: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
