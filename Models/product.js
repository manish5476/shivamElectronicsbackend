const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 100,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
    },
    images: {
      type: [String],
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ["electronics", "clothing", "accessories", "other"], // Customizable categories
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: [
      {
        user: {
          type: String,
          required: true,
          trim: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 0,
          max: 5,
        },
        comment: {
          type: String,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

productSchema.pre("save", async function (next) {
  if (this.isModified("reviews")) {
    this.ratingsCount = this.reviews.length;
    this.ratingsAverage =
      this.reviews.reduce((acc, review) => acc + review.rating, 0) /
      this.ratingsCount;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
