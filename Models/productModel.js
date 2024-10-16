const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  priceDisplay: { type: String },
  promotionPrice: { type: String },
  promotionPriceDisplay: { type: String },
  listPrice: { type: String },
  listPriceDisplay: { type: String },
  modelCode: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  modelName: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  thumbUrl: {
    type: String,
  },
  thumbUrlAlt: {
    type: String,
  },
  largeUrl: {
    type: String,
  },
  galleryImage: {
    type: [String], // Array of strings
  },
  galleryImageAlt: {
    type: [String], // Array of strings
  },
  ratingsAverage: {
    type: Number,
    default: 0,
  },
  ratingsCount: {
    type: Number,
    default: 0,
  },
  reviewUrl: {
    type: String,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  fmyChipList: [
    {
      fmyChipType: {
        type: String,
      },
      fmyChipName: {
        type: String,
      },
    },
  ],
  available: {
    type: String,
  },
  stockStatusText: {
    type: String,
  },
  description: {
    type: [String], // Array of strings
  },
  price: {
    type: String,
    // required: true,
  },
  saveText: {
    type: String,
  },
  monthlyPriceInfo: {
    leasingUpfront: {
      type: String,
    },
    leasingMonthly: {
      type: String,
    },
    leasingMonths: {
      type: String,
    },
    interest: {
      type: String,
    },
  },
  keySummary: [
    {
      displayType: {
        type: String,
      },
      title: {
        type: String,
      },
      imgUrl: {
        type: String,
      },
      imgAlt: {
        type: String,
      },
    },
  ],
  pviTypeName: {
    type: String,
  },
  pviSubtypeName: {
    type: String,
  },
  ctaLocalText: {
    type: String,
  },
  ctaEngText: {
    type: String,
  },
  configuratorUseYn: {
    type: Boolean,
    default: false,
  },
  specCompareYN: {
    type: Boolean,
    default: false,
  },
  isComingSoon: {
    type: Boolean,
    default: false,
  },
  packageYN: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Product", productSchema);
