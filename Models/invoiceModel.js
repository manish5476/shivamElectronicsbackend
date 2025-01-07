const mongoose = require('mongoose');
const { Schema } = mongoose;
const Seller = require('./Seller')
const Product = require("./productModel");
const User = require("./UserModel");
// Main Invoice Schema
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true }, // Reference to SellerSchema
    buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, // Reference to CustomerSchema
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // Reference to ProductSchema
        quantity: { type: Number, required: true, min: 1 },
        discount: { type: Number, default: 0, min: 0 },
        rate: { type: Number, required: true, min: 0 }, // Explicit rate for this invoice (in case of variable pricing)
        taxableValue: { type: Number, required: true, min: 0 },
        gstRate: { type: Number, required: true, min: 0 },
        gstAmount: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    subTotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    cess: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentTerms: { type: String },
    notes: { type: String },
    placeOfSupply: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexing
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ seller: 1 });
invoiceSchema.index({ buyer: 1 });

// Pre-save Middleware for Defaults
invoiceSchema.pre('save', function (next) {
  if (!this.dueDate) {
    this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default due date: 7 days later
  }
  next();
});

// Virtual Populations
invoiceSchema.virtual('sellerDetails', {
  ref: 'Seller',
  localField: 'seller',
  foreignField: '_id',
  justOne: true,
});

invoiceSchema.virtual('buyerDetails', {
  ref: 'Customer',
  localField: 'buyer',
  foreignField: '_id',
  justOne: true,
});

invoiceSchema.virtual('itemDetails', {
  ref: 'Product',
  localField: 'items.product',
  foreignField: '_id',
});

// Pre-find Middleware for Auto-Population
invoiceSchema.pre(/^find/, function (next) {
  this.populate('sellerDetails', '-__v')
    .populate('buyerDetails', '-__v')
    .populate('itemDetails', '-__v');
  next();
});
/////

invoiceSchema.pre('save', async function (next) {
  const Product = mongoose.model('Product'); // Assuming 'Product' is the model name
  // Populate item fields from the product schema
  for (const item of this.items) {
    if (!item.rate || !item.gstRate) {
      const product = await Product.findById(item.product).select(
        'price cgst sgst gstRate'
      );
      if (!product) {
        return next(new Error(`Product with ID ${item.product} not found`));
      }
      // Populate defaults from the product schema if not overridden
      item.rate = item.rate || product.price;
      item.gstRate = item.gstRate || product.gstRate;
      item.taxableValue = item.taxableValue || item.quantity * item.rate;
      item.gstAmount =
        item.gstAmount || (item.taxableValue * item.gstRate) / 100;
      item.amount = item.amount || item.taxableValue + item.gstAmount;
    }
  }

  // Calculate invoice totals
  this.subTotal = this.items.reduce((sum, item) => sum + item.taxableValue, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;

// import mongoose, { Schema, Document } from 'mongoose';
// import { v4 as uuidv4 } from 'uuid';

// interface Item {
//   description: string;
//   hsnCode: string;
//   quantity: number;
//   unit: string;
//   rate: number;
//   discount: number;
//   taxableValue: number;
//   gstRate: number;
//   gstAmount: number;
//   amount: number;
// }

// interface SellerDetails {
//   name: string;
//   address: string;
//   gstin: string;
//   pan: string;
//   contactNumber: string;
// }

// interface BuyerDetails {
//   name: string;
//   address: string;
//   gstin?: string; // Optional
//   pan?: string;//Optional
//   contactNumber?: string;//Optional
// }

// interface InvoiceDoc extends Document {
//   invoiceNumber: string;
//   invoiceDate: Date;
//   dueDate:Date;
//   sellerDetails: SellerDetails;
//   buyerDetails: BuyerDetails;
//   items: Item[];
//   subTotal: number;
//   totalDiscount:number;
//   cgst: number;
//   sgst: number;
//   igst: number;
//   cess:number;
//   totalAmount: number;
//   paymentTerms: string;
//   notes: string;
//   placeOfSupply:string;
// }

// const itemSchema = new Schema<Item>({
//   description: { type: String, required: true },
//   hsnCode: { type: String, required: true },
//   quantity: { type: Number, required: true, min: 0 },
//   unit: { type: String, required: true },
//   rate: { type: Number, required: true, min: 0 },
//   discount: { type: Number, default: 0, min: 0 },
//   taxableValue:{type:Number, required:true, min:0},
//   gstRate: { type: Number, required: true, min: 0 },
//   gstAmount: { type: Number, required: true, min: 0 },
//   amount: { type: Number, required: true, min: 0 },
// }, { _id: false });

// const sellerDetailsSchema = new Schema<SellerDetails>({
//   name: { type: String, required: true },
//   address: { type: String, required: true },
//   gstin: { type: String, required: true, match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/ },
//   pan: { type: String, required: true, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
//   contactNumber: { type: String },
// }, { _id: false });

// const buyerDetailsSchema = new Schema<BuyerDetails>({
//   name: { type: String, required: true },
//   address: { type: String, required: true },
//   gstin: { type: String, match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/ },
//   pan: { type: String, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
//   contactNumber: { type: String },
// }, { _id: false });

// const invoiceSchema = new Schema<InvoiceDoc>({
//   invoiceNumber: { type: String, required: true, unique: true },
//   invoiceDate: { type: Date, required: true },
//   dueDate:{type:Date},
//   sellerDetails: { type: sellerDetailsSchema, required: true },
//   buyerDetails: { type: buyerDetailsSchema, required: true },
//   items: [itemSchema],
//   subTotal: { type: Number, required: true, min: 0 },
//   totalDiscount:{type:Number, default:0, min:0},
//   cgst: { type: Number, default: 0, min: 0 },
//   sgst: { type: Number, default: 0, min: 0 },
//   igst: { type: Number, default: 0, min: 0 },
//   cess:{type:Number, default:0, min:0},
//   totalAmount: { type: Number, required: true, min: 0 },
//   paymentTerms: { type: String },
//   notes: { type: String },
//   placeOfSupply:{type:String, required:true}
// }, { timestamps: true });

// const InvoiceModel = mongoose.model<InvoiceDoc>('Invoice', invoiceSchema);

// export default InvoiceModel;
// export {InvoiceDoc,Item,SellerDetails,BuyerDetails};