const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 100,
    },
    brand: {
      type: String,
      // required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    price: {
      type: Number,
      // required: true,
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
      // required: true,
    },
    stock: {
      type: Number,
      // required: true,
      min: 0,
    },
    category: {
      type: String,
      // required: true,
      // enum: ["electronics", "clothing", "accessories", "other"], // Customizable categories
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
          // required: true,
          trim: true,
        },
        rating: {
          type: Number,
          // required: true,
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
// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       trim: true,
//       unique: true,
//       minlength: 3,
//       maxlength: 100,
//     },
//     modelCode: {
//       type: String,
//       unique: true,
//     },
//     displayName: {
//       type: String,
//       trim: true,
//     },
//     brand: {
//       type: String,
//       trim: true,
//       minlength: 2,
//       maxlength: 50,
//     },
//     price: {
//       type: Number,
//       min: 0,
//     },
//     promotionPrice: {
//       type: Number,
//       min: 0,
//     },
//     listPrice: {
//       type: Number,
//       min: 0,
//     },
//     saveText: {
//       type: String,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     features: {
//       type: [String],
//     },
//     usp: {
//       type: [String],
//     },
//     images: {
//       type: [String],
//     },
//     galleryImage: {
//       type: [String],
//     },
//     galleryImageAlt: {
//       type: [String],
//     },
//     thumbUrl: {
//       type: String,
//     },
//     largeUrl: {
//       type: String,
//     },
//     pdpUrl: {
//       type: String,
//     },
//     stock: {
//       type: Number,
//       min: 0,
//     },
//     stockStatusText: {
//       type: String,
//     },
//     category: {
//       type: String,
//     },
//     categorySubTypeCode: {
//       type: String,
//     },
//     categorySubTypeEngName: {
//       type: String,
//     },
//     ratingsAverage: {
//       type: Number,
//       default: 0,
//       min: 0,
//       max: 5,
//     },
//     ratingsCount: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     reviews: [
//       {
//         user: {
//           type: String,
//           trim: true,
//         },
//         rating: {
//           type: Number,
//           min: 0,
//           max: 5,
//         },
//         comment: {
//           type: String,
//           trim: true,
//         },
//         date: {
//           type: Date,
//           default: Date.now,
//         },
//       },
//     ],
//     chipOptions: [
//       {
//         fmyChipType: String,
//         optionTypeCode: String,
//         optionList: [
//           {
//             optionCode: String,
//             optionName: String,
//             optionLocalName: String,
//           },
//         ],
//       },
//     ],
//     fmyChipList: [
//       {
//         fmyChipType: String,
//         fmyChipCode: String,
//         fmyChipName: String,
//         fmyChipLocalName: String,
//       },
//     ],
//     financing: {
//       type: Boolean,
//     },
//     financingDesc: {
//       type: [String],
//     },
//     energyLabelGrade: {
//       type: String,
//     },
//     pviTypeName: {
//       type: String,
//     },
//     pviSubtypeName: {
//       type: String,
//     },
//     familyId: {
//       type: String,
//     },
//     fmyMarketingName: {
//       type: String,
//     },
//     fmyEngName: {
//       type: String,
//     },
//     productGroupId: {
//       type: String,
//     },
//     simplePdYN: {
//       type: String,
//     },
//     oldProductYN: {
//       type: String,
//     },
//     configuratorUrl: {
//       type: String,
//     },
//     energyFileUrl: {
//       type: String,
//     },
//     ficheFileUrl: {
//       type: String,
//     },
//     monthlyPriceInfo: {
//       leasingUpfront: String,
//       leasingMonthly: String,
//       leasingMonths: String,
//       interest: String,
//     },
//     ctaType: {
//       type: String,
//     },
//     offerCtaFlag: {
//       type: String,
//     },
//     wtbUseFlag: {
//       type: String,
//     },
//     tradeIn: {
//       type: String,
//     },
//     tradeInDesc: {
//       type: String,
//     },
//     premiumCare: {
//       type: String,
//     },
//     premiumCareDesc: {
//       type: String,
//     },
//     upgrade: {
//       type: String,
//     },
//     upgradeDesc: {
//       type: String,
//     },
//     topFlags: {
//       iconTypeCd: String,
//       iconTitle: String,
//     },
//     merchandisingText: {
//       type: String,
//     },
//     keySummary: {
//       type: String,
//     },
//     emiCalculatorUrl: {
//       type: String,
//     },
//     deliveryYN: {
//       type: String,
//     },
//     buyingConfigLinkType: {
//       type: String,
//     },
//     buyingConfigLink: {
//       type: String,
//     },
//     bespokeCtaUse: {
//       type: String,
//     },
//     bespokeCtaLink: {
//       type: String,
//     },
//     ctaLocalText: {
//       type: String,
//     },
//     ctaEngText: {
//       type: String,
//     },
//     configuratorUseYn: {
//       type: String,
//     },
//     pf360IconUse: {
//       type: String,
//     },
//     uspText: {
//       type: String,
//     },
//     lowestWasPrice: {
//       type: Number,
//     },
//     lowestWasPriceDisplay: {
//       type: String,
//     },
//     specCompareYN: {
//       type: String,
//     },
//     isComingSoon: {
//       type: Boolean,
//     },
//     packageYN: {
//       type: String,
//     },
//     pkgChildModelList: {
//       type: [String],
//     },
//     keySpec: {
//       type: String,
//     },
//   },
//   { timestamps: true }
// );

// productSchema.pre("save", async function (next) {
//   if (this.isModified("reviews")) {
//     this.ratingsCount = this.reviews.length;
//     this.ratingsAverage =
//       this.reviews.reduce((acc, review) => acc + review.rating, 0) /
//       this.ratingsCount;
//   }
//   next();
// });

// module.exports = mongoose.model("Product", productSchema);
