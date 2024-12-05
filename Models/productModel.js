const mongoose = require("mongoose");
const User = require("./UserModel");
const slugify = require("slugify");
const Review = require("./ReviewSchema");
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
    ],
    thumbnail: { type: String, required: true },
    userSecretCode: { type: String, required: true }, // User's secret code
    invoiceDetails: invoiceSchema,
    salesPerson: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  { timestamps: true }
);

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

productSchema.pre("save", function (next) {
  this.populate({
    path: "salesPerson",
    select: "-__v -createdAt", // Exclude the `__v` and `createdAt` fields from thr shalesperson key
  });
  next();
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "salesPerson",
    select: "name email",
  });
  next();
});

productSchema.virtual("finalPrice").get(function () {
  return this.price - (this.price * this.discountPercentage) / 100;
});

//two way virtual binding to get the data  virtuala populalte the data
productSchema.virtual("reviews", {
  ref: "Review",//here it is showing review model
  foreignField: "product",//here this field describr th key in Review
  localField: "_id",
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
