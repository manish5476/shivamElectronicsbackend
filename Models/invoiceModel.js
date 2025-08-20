// Models/invoiceModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Product = require('./productModel');
const User = require('./UserModel');

const invoiceItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    customTitle: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    isCustomProduct: { type: Boolean, default: false }
});

const invoiceSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [invoiceItemSchema],
    subTotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// --- Virtuals ---
invoiceSchema.virtual('sellerDetails', {
    ref: 'Seller',
    localField: 'seller',
    foreignField: '_id',
    justOne: true
});

invoiceSchema.virtual('buyerDetails', {
    ref: 'Customer',
    localField: 'buyer',
    foreignField: '_id',
    justOne: true
});

invoiceSchema.virtual('itemDetails', {
    ref: 'Product',
    localField: 'items.product',
    foreignField: '_id'
});

// --- Auto populate on find ---
invoiceSchema.pre(/^find/, function (next) {
    this.populate('sellerDetails')
        .populate('buyerDetails', 'fullname phoneNumbers addresses')
        .populate('itemDetails', 'title');
    next();
});

// --- Pre-save: calculate totals & update stock ---
invoiceSchema.pre('save', async function (next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!this.dueDate) {
            this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        let subTotal = 0, totalDiscount = 0, totalGst = 0;

        for (const item of this.items) {
            let product = null;
            if (item.product) {
                product = await Product.findById(item.product).session(session);
            }

            if (product) {
                if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.title}`);
                if (item.rate == null) item.rate = product.rate ?? 0;
                if (item.gstRate == null) item.gstRate = product.gstRate ?? 0;
                if (!item.customTitle) item.customTitle = product.title;
                item.isCustomProduct = false;

                product.stock -= item.quantity;
                await product.save({ session });
            } else {
                if (!item.customTitle) throw new Error(`Custom title required for custom product`);
                if (item.rate == null) throw new Error(`Rate required for custom product "${item.customTitle}"`);
                if (item.gstRate == null) item.gstRate = 0;
                item.isCustomProduct = true;
            }

            item.taxableValue = item.quantity * item.rate;
            const discountedValue = item.taxableValue - (item.taxableValue * item.discount / 100);
            item.gstAmount = (discountedValue * item.gstRate) / 100;
            item.amount = discountedValue + item.gstAmount;

            subTotal += item.taxableValue;
            totalDiscount += (item.taxableValue * item.discount / 100);
            totalGst += item.gstAmount;
        }

        this.subTotal = subTotal;
        this.totalDiscount = totalDiscount;
        this.gst = totalGst;
        this.totalAmount = subTotal + totalGst - totalDiscount;

        await session.commitTransaction();
        next();
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
});

// --- Post-save: recalc balances ---
invoiceSchema.post('save', async function (doc) {
    const Customer = mongoose.model("Customer");
    await Customer.recalculateBalances(doc.buyer);
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;









// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Product = require('./productModel'); // Avoid circular dependency with Customer
// const User =require('./UserModel')

// // this was old one --------
// // const invoiceItemSchema = new Schema({
// //     product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
// //     quantity: { type: Number, required: true, min: 1 },
// //     discount: { type: Number, default: 0, min: 0 },
// //     rate: { type: Number, required: true, min: 0 },
// //     taxableValue: { type: Number, required: true, min: 0 },
// //     gstRate: { type: Number, required: true, min: 0 },
// //     gstAmount: { type: Number, required: true, min: 0 },
// //     amount: { type: Number, required: true, min: 0 },
// // });
// const invoiceItemSchema = new Schema({
//     product: { type: Schema.Types.ObjectId, ref: 'Product' }, // Optional for custom products
//     customTitle: { type: String }, // Only for custom items
//     quantity: { type: Number, required: true, min: 1 },
//     discount: { type: Number, default: 0, min: 0 },
//     rate: { type: Number, required: true, min: 0 },
//     taxableValue: { type: Number, required: true, min: 0 },
//     gstRate: { type: Number, required: true, min: 0 },
//     gstAmount: { type: Number, required: true, min: 0 },
//     amount: { type: Number, required: true, min: 0 },
//     isCustomProduct: { type: Boolean, default: false }
// });


// const invoiceSchema = new Schema({
//     owner: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User', // Assumes you have a 'User' model
//         required: true // Every customer must belong to a user
//     },
//     invoiceNumber: { type: String, required: true, unique: true },
//     invoiceDate: { type: Date, required: true },
//     dueDate: { type: Date },
//     seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
//     buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
//     items: [invoiceItemSchema],
//     subTotal: { type: Number, required: true, min: 0 },
//     totalDiscount: { type: Number, default: 0, min: 0 },
//     gst: { type: Number, default: 0, min: 0 },
//     totalAmount: { type: Number, required: true, min: 0 },
//     status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
// }, {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
// });

// // Virtuals and Pre / Post hooks(no changes needed)
// invoiceSchema.virtual('sellerDetails', {
//     ref: 'Seller',
//     localField: 'seller',
//     foreignField: '_id',
//     justOne: true
// });

// invoiceSchema.virtual('buyerDetails', {
//     ref: 'Customer',
//     localField: 'buyer',
//     foreignField: '_id',
//     justOne: true
// });

// invoiceSchema.virtual('itemDetails', {
//     ref: 'Product',
//     localField: 'items.product',
//     foreignField: '_id'
// });

// invoiceSchema.pre(/^find/, function (next) {
//     this.populate('sellerDetails', '')
//         .populate('buyerDetails', ' fullname phoneNumbers  addresses ')
//         .populate('itemDetails', 'title ');
//     next();
// });

// // invoiceSchema.pre('save', async function (next) {
// //     const session = await mongoose.startSession();
// //     session.startTransaction();
// //     try {
// //         if (!this.dueDate) {
// //             this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
// //         }
// //         let subTotal = 0, totalDiscount = 0, totalGst = 0;

// //         for (const item of this.items) {
// //             const product = await Product.findById(item.product).session(session);
// //             if (!product) throw new Error(`Product ${item.product} not found`);
// //             if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.title}`);
// //             // If rate is not provided, use the product rate as default.
// //             if (item.rate == null || item.rate == undefined) {
// //                 item.rate = product.rate ?? 0;
// //             }
// //             // If gstRate is not provided, use the product gstRate as default.
// //             if (item.gstRate == null || item.gstRate == undefined) {
// //                 item.gstRate = product.gstRate ?? 0;
// //             }
// //             // Discount is always taken from the item, no default needed.
// //             item.taxableValue = item.quantity * item.rate;
// //             const discountedTaxableValue = item.taxableValue - (item.taxableValue * item.discount / 100);
// //             item.gstAmount = (discountedTaxableValue * item.gstRate) / 100;
// //             item.amount = discountedTaxableValue + item.gstAmount;

// //             subTotal += item.taxableValue;
// //             totalDiscount += (item.taxableValue * item.discount / 100);
// //             totalGst += item.gstAmount;

// //             product.stock -= item.quantity;
// //             await product.save({ session });
// //         }

// //         this.subTotal = subTotal;
// //         this.totalDiscount = totalDiscount;
// //         this.gst = totalGst;
// //         this.totalAmount = subTotal + totalGst - totalDiscount;

// //         await session.commitTransaction();
// //         next();
// //     } catch (error) {
// //         await session.abortTransaction();
// //         next(error);
// //     } finally {
// //         session.endSession();
// //     }
// // });




// // ////////////
// // Post-save: Update customer cart

// invoiceSchema.pre('save', async function (next) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         if (!this.dueDate) {
//             this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
//         }
//         let subTotal = 0, totalDiscount = 0, totalGst = 0;
//         for (const item of this.items) {
//             let product = null;
//             if (item.product) {
//                 product = await Product.findById(item.product).session(session);
//             }
//             if (product) {
//                 // Inventory product
//                 if (product.stock < item.quantity) {
//                     throw new Error(`Insufficient stock for ${product.title}`);
//                 }
//                 // Fill missing fields from product
//                 if (item.rate == null) item.rate = product.rate ?? 0;
//                 if (item.gstRate == null) item.gstRate = product.gstRate ?? 0;
//                 if (!item.customTitle) item.customTitle = product.title;
//                 item.isCustomProduct = false;
//                 // Deduct stock
//                 product.stock -= item.quantity;
//                 await product.save({ session });
//             } else {
//                 // Custom product (not found in inventory)
//                 if (!item.customTitle || typeof item.customTitle !== 'string') {
//                     throw new Error(`Custom title must be provided for non-inventory product`);
//                 }
//                 if (item.rate == null) {
//                     throw new Error(`Rate must be provided for custom product "${item.customTitle}"`);
//                 }
//                 if (item.gstRate == null) item.gstRate = 0;
//                 item.isCustomProduct = true;
//             }

//             // Calculations
//             item.taxableValue = item.quantity * item.rate;
//             const discountedValue = item.taxableValue - (item.taxableValue * item.discount / 100);
//             item.gstAmount = (discountedValue * item.gstRate) / 100;
//             item.amount = discountedValue + item.gstAmount;
//             subTotal += item.taxableValue;
//             totalDiscount += (item.taxableValue * item.discount / 100);
//             totalGst += item.gstAmount;
//         }
//         this.subTotal = subTotal;
//         this.totalDiscount = totalDiscount;
//         this.gst = totalGst;
//         this.totalAmount = subTotal + totalGst - totalDiscount;
//         await session.commitTransaction();
//         next();
//     } catch (error) {
//         await session.abortTransaction();
//         next(error);
//     } finally {
//         session.endSession();
//     }
// });

// // customer
// invoiceSchema.post('save', async function (doc) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         const Customer = require('./customerModel'); // Avoid circular dependency
//         const customer = await Customer.findById(doc.buyer).session(session);
//         if (!customer) throw new Error('Customer not found');
//         for (const item of doc.items) {
//             const cartItem = customer.cart.items.find(cartItem =>
//                 cartItem.productId.toString() === item.product.toString()
//             );
//             if (cartItem) {
//                 cartItem.invoiceIds.push(doc._id);
//             } else {
//                 customer.cart.items.push({ productId: item.product, invoiceIds: [doc._id] });
//             }
//         }

//         await customer.save({ session });

//         if (typeof Customer.updateCustomerTotals === 'function') {
//             await Customer.updateCustomerTotals(doc.buyer, session);
//         } else {
//             console.warn("updateCustomerTotals function not found in Customer model");
//         }

//         await session.commitTransaction();
//     } catch (error) {
//         await session.abortTransaction();
//         throw new mongoose.Error(`Failed to update customer cart: ${error.message}`);
//     } finally {
//         session.endSession();
//     }
// });

// const Invoice = mongoose.model('Invoice', invoiceSchema);
// module.exports = Invoice;
