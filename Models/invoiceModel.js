const mongoose = require('mongoose');
const { Schema } = mongoose;

// Invoice Item Subdocument Schema (for better organization)
const invoiceItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
});

// Invoice Schema (Advanced)
const invoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [invoiceItemSchema], // Use the subdocument schema
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
    status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
    metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

// Pre-save Middleware (Advanced with Error Handling and Transactions)
invoiceSchema.pre('save', async function (next) {
    if (!this.dueDate) {
        this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const Product = mongoose.model('Product');
    let subTotal = 0;
    let totalDiscount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;

    try {
      // Use a for...of loop for async operations inside the loop
        for (const item of this.items) {
            const product = await Product.findById(item.product).select('price cgst sgst gstRate');
            if (!product) throw new Error(`Product with ID ${item.product} not found`);

            item.rate = item.rate || product.price;
            item.gstRate = item.gstRate || product.gstRate || 0;
            item.taxableValue = item.quantity * item.rate;
            item.gstAmount = (item.taxableValue * item.gstRate) / 100;
            item.amount = item.taxableValue + item.gstAmount;

            subTotal += item.taxableValue;
            totalDiscount += item.discount;
            cgst += (product.cgst || 0) * item.gstAmount / item.gstRate;
            sgst += (product.sgst || 0) * item.gstAmount / item.gstRate;
            igst += (product.gstRate || 0) * item.gstAmount / item.gstRate;
            cess += 0;
        }

        this.subTotal = subTotal;
        this.totalDiscount = totalDiscount;
        this.cgst = cgst;
        this.sgst = sgst;
        this.igst = igst;
        this.cess = cess;
        this.totalAmount = this.subTotal + this.cgst + this.sgst + this.igst + this.cess - this.totalDiscount;

        next();
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

// Virtuals and Pre-find (No changes needed)
invoiceSchema.virtual('sellerDetails', { ref: 'Seller', localField: 'seller', foreignField: '_id', justOne: true });
invoiceSchema.virtual('buyerDetails', { ref: 'Customer', localField: 'buyer', foreignField: '_id', justOne: true });
invoiceSchema.virtual('itemDetails', { ref: 'Product', localField: 'items.product', foreignField: '_id' });

invoiceSchema.pre(/^find/, function (next) {
    this.populate('sellerDetails', '-__v').populate('buyerDetails', '-__v').populate('itemDetails', '-__v');
    next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// // Invoice Schema (Refined)
// const invoiceSchema = new Schema({
//     invoiceNumber: { type: String, required: true, unique: true },
//     invoiceDate: { type: Date, required: true },
//     dueDate: { type: Date },
//     seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
//     buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
//     items: [{
//         product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//         quantity: { type: Number, required: true, min: 1 },
//         discount: { type: Number, default: 0, min: 0 },
//         rate: { type: Number, required: true, min: 0 }, // Rate at the time of invoice
//         taxableValue: { type: Number, required: true, min: 0 },
//         gstRate: { type: Number, required: true, min: 0 },
//         gstAmount: { type: Number, required: true, min: 0 },
//         amount: { type: Number, required: true, min: 0 },
//     }],
//     subTotal: { type: Number, required: true, min: 0 },
//     totalDiscount: { type: Number, default: 0, min: 0 },
//     cgst: { type: Number, default: 0, min: 0 },
//     sgst: { type: Number, default: 0, min: 0 },
//     igst: { type: Number, default: 0, min: 0 },
//     cess: { type: Number, default: 0, min: 0 },
//     totalAmount: { type: Number, required: true, min: 0 },
//     paymentTerms: { type: String },
//     notes: { type: String },
//     placeOfSupply: { type: String, required: true },
//     status:{
//         type:String,
//         enum:['paid','unpaid','partially paid','cancelled'],
//         default:'unpaid'
//     },
//     metadata:{
//         type:Map,
//         of:Schema.Types.Mixed
//     }
// }, { timestamps: true });

// // Pre-save Middleware (Refined)
// invoiceSchema.pre('save', async function (next) {
//     if (!this.dueDate) {
//         this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
//     }

//     const Product = mongoose.model('Product');
//     let subTotal = 0;
//     let totalDiscount = 0;
//     let cgst = 0;
//     let sgst = 0;
//     let igst = 0;
//     let cess = 0;

//     for (const item of this.items) {
//         const product = await Product.findById(item.product).select('price cgst sgst gstRate');
//         if (!product) return next(new Error(`Product with ID ${item.product} not found`));

//         item.rate = item.rate || product.price;
//         item.gstRate = item.gstRate || product.gstRate || 0; // Handle missing gstRate
//         item.taxableValue = item.quantity * item.rate;
//         item.gstAmount = (item.taxableValue * item.gstRate) / 100;
//         item.amount = item.taxableValue + item.gstAmount;

//         subTotal += item.taxableValue;
//         totalDiscount += item.discount; // Assuming discount is per item
//         cgst += (product.cgst || 0) * item.gstAmount/item.gstRate;
//         sgst += (product.sgst || 0) * item.gstAmount/item.gstRate;
//         igst += (product.gstRate || 0) * item.gstAmount/item.gstRate;
//         cess += 0; //add cess logic if needed
//     }

//     this.subTotal = subTotal;
//     this.totalDiscount = totalDiscount;
//     this.cgst = cgst;
//     this.sgst = sgst;
//     this.igst = igst;
//     this.cess = cess;
//     this.totalAmount = this.subTotal + this.cgst + this.sgst + this.igst + this.cess - this.totalDiscount;

//     next();
// });

// // Virtuals and Pre-find (No significant changes needed)
// invoiceSchema.virtual('sellerDetails', { ref: 'Seller', localField: 'seller', foreignField: '_id', justOne: true });
// invoiceSchema.virtual('buyerDetails', { ref: 'Customer', localField: 'buyer', foreignField: '_id', justOne: true });
// invoiceSchema.virtual('itemDetails', { ref: 'Product', localField: 'items.product', foreignField: '_id' });

// invoiceSchema.pre(/^find/, function (next) {
//     this.populate('sellerDetails', '-__v').populate('buyerDetails', '-__v').populate('itemDetails', '-__v');
//     next();
// });

// const Invoice = mongoose.model('Invoice', invoiceSchema);
// module.exports = Invoice;
// // const mongoose = require('mongoose');
// // const { Schema } = mongoose;
// // const Seller = require('./Seller')
// // const Product = require("./productModel");
// // const User = require("./UserModel");
// // // Main Invoice Schema
// // const invoiceSchema = new Schema(
// //   {
// //     invoiceNumber: { type: String, required: true, unique: true },
// //     invoiceDate: { type: Date, required: true },
// //     dueDate: { type: Date },
// //     seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true }, // Reference to SellerSchema
// //     buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, // Reference to CustomerSchema
// //     items: [
// //       {
// //         product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // Reference to ProductSchema
// //         quantity: { type: Number, required: true, min: 1 },
// //         discount: { type: Number, default: 0, min: 0 },
// //         rate: { type: Number, required: true, min: 0 }, // Explicit rate for this invoice (in case of variable pricing)
// //         taxableValue: { type: Number, required: true, min: 0 },
// //         gstRate: { type: Number, required: true, min: 0 },
// //         gstAmount: { type: Number, required: true, min: 0 },
// //         amount: { type: Number, required: true, min: 0 },
// //       },
// //     ],
// //     subTotal: { type: Number, required: true, min: 0 },
// //     totalDiscount: { type: Number, default: 0, min: 0 },
// //     cgst: { type: Number, default: 0, min: 0 },
// //     sgst: { type: Number, default: 0, min: 0 },
// //     igst: { type: Number, default: 0, min: 0 },
// //     cess: { type: Number, default: 0, min: 0 },
// //     totalAmount: { type: Number, required: true, min: 0 },
// //     paymentTerms: { type: String },
// //     notes: { type: String },
// //     placeOfSupply: { type: String, required: true },
// //   },
// //   { timestamps: true }
// // );

// // // Indexing
// // invoiceSchema.index({ invoiceNumber: 1 });
// // invoiceSchema.index({ invoiceDate: 1 });
// // invoiceSchema.index({ seller: 1 });
// // invoiceSchema.index({ buyer: 1 });

// // // Pre-save Middleware for Defaults
// // invoiceSchema.pre('save', function (next) {
// //   if (!this.dueDate) {
// //     this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default due date: 7 days later
// //   }
// //   next();
// // });

// // // Virtual Populations
// // invoiceSchema.virtual('sellerDetails', {
// //   ref: 'Seller',
// //   localField: 'seller',
// //   foreignField: '_id',
// //   justOne: true,
// // });

// // invoiceSchema.virtual('buyerDetails', {
// //   ref: 'Customer',
// //   localField: 'buyer',
// //   foreignField: '_id',
// //   justOne: true,
// // });

// // invoiceSchema.virtual('itemDetails', {
// //   ref: 'Product',
// //   localField: 'items.product',
// //   foreignField: '_id',
// // });

// // // Pre-find Middleware for Auto-Population
// // invoiceSchema.pre(/^find/, function (next) {
// //   this.populate('sellerDetails', '-__v')
// //     .populate('buyerDetails', '-__v')
// //     .populate('itemDetails', '-__v');
// //   next();
// // });
// // /////

// // invoiceSchema.pre('save', async function (next) {
// //   const Product = mongoose.model('Product'); // Assuming 'Product' is the model name
// //   // Populate item fields from the product schema
// //   for (const item of this.items) {
// //     if (!item.rate || !item.gstRate) {
// //       const product = await Product.findById(item.product).select(
// //         'price cgst sgst gstRate'
// //       );
// //       if (!product) {
// //         return next(new Error(`Product with ID ${item.product} not found`));
// //       }
// //       // Populate defaults from the product schema if not overridden
// //       item.rate = item.rate || product.price;
// //       item.gstRate = item.gstRate || product.gstRate;
// //       item.taxableValue = item.taxableValue || item.quantity * item.rate;
// //       item.gstAmount =
// //         item.gstAmount || (item.taxableValue * item.gstRate) / 100;
// //       item.amount = item.amount || item.taxableValue + item.gstAmount;
// //     }
// //   }

// //   // Calculate invoice totals
// //   this.subTotal = this.items.reduce((sum, item) => sum + item.taxableValue, 0);
// //   this.totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);

// //   next();
// // });

// // const Invoice = mongoose.model('Invoice', invoiceSchema);
// // module.exports = Invoice;
