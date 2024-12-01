const mongoose = require("mongoose");
const User = require("./UserModel");
const slugify = require("slugify");
// Sub-schema for Distributor Details
const distributorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  gstNumber: { type: String, required: true }, // GSTIN
  address: { type: String, required: true },
});

// Sub-schema for Company Details
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  gstNumber: { type: String, required: true }, // GSTIN
  website: { type: String }, // Optional
});

// Sub-schema for Invoice Details
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  totalAmount: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  distributorDetails: distributorSchema, // Embedded distributor details
  companyDetails: companySchema, // Embedded company details
});

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    // productID:{type:String,unique:true,},
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    detailedDescriptions: [
      {
        id: { type: String, required: true },
        detail: { type: String, required: true },
      },
    ], // Array of objects for detailed descriptions
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    tags: [{ type: String, trim: true }],
    brand: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    dimensions: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      depth: { type: Number, required: true },
    },
    warrantyInformation: { type: String, required: true, trim: true },
    shippingInformation: { type: String, required: true, trim: true },
    availabilityStatus: {
      type: String,
      enum: ["In Stock", "Low Stock", "Out of Stock"],
      required: true,
    },

    StartLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: { type: String },
      description: { type: String },
    },

    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: { type: String },
        description: { type: String },
        day: { type: Number },
      },
    ],
    // reviews: [
    //   {
    //     reviewerName: { type: String, required: true },
    //     reviewerEmail: { type: String, required: true },
    //     rating: { type: Number, min: 1, max: 5, required: true },
    //     comment: { type: String, required: true },
    //     createdAt: { type: Date, default: Date.now },
    //     User:{
    //       type: mongoose.Schema.Types.ObjectId, ref: 'User'
    //     },
    //     Product:{
    //       type:mongoose.Schema.ObjectId,ref:'Product'
    //     }
    //   },
    // ], // Nested reviews
    returnPolicy: { type: String, required: true, trim: true },
    minimumOrderQuantity: { type: Number, default: 1 },
    meta: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      barcode: { type: String, required: true, unique: true },
      qrCode: { type: String }, // Optional
    },
    images: [
      {
        id: { type: String, required: false },
        detail: { type: String, required: false },
        link: { type: String, required: false },
      },
    ], // Array of image objects
    salesPerson: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    thumbnail: { type: String, required: true },
    userSecretCode: { type: String, required: true }, // User's secret code
    invoiceDetails: invoiceSchema, // Embedded invoice schema
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  { timestamps: true }
);

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// productSchema.virtual('durationWeek').get(function () {
//   return this.duration / 7;
// });

//it automaticallluy populate the sales person
productSchema.pre("save", function (next) {
  this.populate({
    path: "salesPerson",
    select: "-__v -createdAt", // Exclude the `__v` and `createdAt` fields from thr shalesperson key
  });
});

productSchema.virtual("finalPrice").get(function () {
  return this.price - (this.price * this.discountPercentage) / 100;
});

productSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

// productSchema.pre('save',async function(next){
//   const salesPersonpromise= this.salesPerson.map(async id=> await User.findById(id))
//   this.salesPerson=await promise.all(salesPersonpromise)
//   next()
// })

productSchema.post(/^find/, function (docs, next) {
  // console.log(docs);
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;

// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema({
//   priceDisplay: { type: String },
//   promotionPrice: { type: String },
//   promotionPriceDisplay: { type: String },
//   listPrice: { type: String },
//   listPriceDisplay: { type: String },
//   modelCode: {
//     type: String,
//     required: [true, "Must have a model code"],
//   },
//   category: {
//     type: String,
//   },
//   modelName: {
//     type: String,
//     unique: true, // Fixed casing here
//     required: true,
//   },
//   displayName: {
//     type: String,
//     unique: true, // Fixed casing here
//     required: true,
//   },
//   thumbUrl: {
//     type: String,
//   },
//   thumbUrlAlt: {
//     type: String,
//   },
//   largeUrl: {
//     type: String,
//   },
//   galleryImage: {
//     type: [String], // Array of strings
//   },
//   galleryImageAlt: {
//     type: [String], // Array of strings
//   },
//   ratingsAverage: {
//     type: Number,
//     default: 0,
//   },
//   ratingsCount: {
//     type: Number,
//     default: 0,
//   },
//   reviewUrl: {
//     type: String,
//   },
//   selected: {
//     type: Boolean,
//     default: false,
//   },
//   fmyChipList: [
//     {
//       fmyChipType: {
//         type: String,
//       },
//       fmyChipName: {
//         type: String,
//       },
//     },
//   ],
//   available: {
//     type: String,
//   },
//   stockStatusText: {
//     type: String,
//   },
//   description: {
//     type: [String], // Array of strings
//   },
//   price: {
//     type: String,
//     // required: true,
//   },
//   saveText: {
//     type: String,
//   },
//   monthlyPriceInfo: {
//     leasingUpfront: {
//       type: String,
//     },
//     leasingMonthly: {
//       type: String,
//     },
//     leasingMonths: {
//       type: String,
//     },
//     interest: {
//       type: String,
//     },
//   },
//   keySummary: [
//     {
//       displayType: {
//         type: String,
//       },
//       title: {
//         type: String,
//       },
//       imgUrl: {
//         type: String,
//       },
//       imgAlt: {
//         type: String,
//       },
//     },
//   ],
//   pviTypeName: {
//     type: String,
//   },
//   pviSubtypeName: {
//     type: String,
//   },
//   ctaLocalText: {
//     type: String,
//   },
//   ctaEngText: {
//     type: String,
//   },
//   configuratorUseYn: {
//     type: Boolean,
//     default: false,
//   },
//   specCompareYN: {
//     type: Boolean,
//     default: false,
//   },
//   isComingSoon: {
//     type: Boolean,
//     default: false,
//   },
//   packageYN: {
//     type: Boolean,
//     default: false,
//   },
// });

// module.exports = mongoose.model("Product", productSchema);
