
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Seller = require("./Seller");
const Customer = require("./customerModel");

// Invoice Item Subdocument Schema (Simplified GST - using only gstRate)
const invoiceItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    rate: { type: Number, required: true, min: 0 }, // Rate is base rate (ex-GST), now defaults from Product
    taxableValue: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 }, // Item-level GST rate (taken from Product)
    gstAmount: { type: Number, required: true, min: 0 }, // Item-level total GST amount
    amount: { type: Number, required: true, min: 0 }, // Total amount (taxableValue + gstAmount)
});

// Invoice Schema
const invoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [invoiceItemSchema],
    subTotal: { type: Number, required: true, min: 0 }, // Subtotal of taxable values
    totalDiscount: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0 },     // Invoice-level total GST (combined CGST/SGST/IGST)
    cess: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }, // Total invoice amount
    paymentTerms: { type: String },
    notes: { type: String },
    placeOfSupply: { type: String, required: true },
    status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
    metadata: { type: Map, of: Schema.Types.Mixed },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save Middleware (Simplified GST Calculation using only gstRate)
invoiceSchema.pre('save', async function (next) {
    if (!this.dueDate) {
        this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    const Product = mongoose.model('Product');
    let subTotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let cess = 0;

    try {
        for (const item of this.items) {
            const product = await Product.findById(item.product).select('rate gstRate');
            if (!product) throw new Error(`Product with ID ${item.product} not found`);

            item.rate = item.rate || product.rate;
            item.gstRate = product.gstRate;

            item.taxableValue = item.quantity * item.rate;
            item.discount = item.discount || 0;

            const discountedTaxableValue = item.taxableValue - (item.taxableValue * item.discount / 100);
            item.gstAmount = (discountedTaxableValue * item.gstRate) / 100; // Calculate total GST
            item.amount = discountedTaxableValue + item.gstAmount; // Total item amount

            subTotal += item.taxableValue;
            totalDiscount += (item.taxableValue * item.discount / 100);
            totalGst += item.gstAmount; // Accumulate total GST
            cess += 0;
        }

        this.subTotal = subTotal;
        this.totalDiscount = totalDiscount;
        this.gst = totalGst; // Invoice-level total GST
        this.cess = cess;
        this.totalAmount = this.subTotal + this.gst + this.cess - this.totalDiscount;

        next();
    } catch (error) {
        next(error);
    }
});

// Virtuals and Pre/Post hooks (no changes needed)
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

invoiceSchema.pre(/^find/, function (next) {
    this.populate('sellerDetails', '-__v')
        .populate('buyerDetails', '-__v')
        .populate('itemDetails', '-__v');
    next();
});

invoiceSchema.post('save', async function (doc, next) {
    try {
        // 1. Find the customer (buyer) associated with this invoice
        const customer = await Customer.findById(doc.buyer);

        if (!customer) {
            return next(new Error('Customer not found'));
        }

        // 2. Iterate through the items in the invoice and update the customer's cart
        for (const item of doc.items) {
            const cartItem = customer.cart.items.find(
                (cartItem) => cartItem.productId.toString() === item.product.toString()
            );

            if (cartItem) {
                cartItem.invoiceIds.push(doc._id);
            } else {
                customer.cart.items.push({
                    productId: item.product,
                    invoiceIds: [doc._id],
                });
            }
        }
        // 3. Save the updated customer document
        await customer.save();

        next();  // Continue with other operations
    } catch (error) {
        next(error);  // Pass the error to the error handler
    }

});


invoiceSchema.post('save', async function (doc, next) {
    try {
        // Update Seller's Sales History
        const seller = await Seller.findById(doc.seller);
        if (!seller) {
            return next(new Error('Seller not found'));
        }

        // Add sales history records to seller's salesHistory
        for (const item of doc.items) {
            seller.salesHistory.push({
                customer: doc.buyer,   // The customer buying the product
                product: item.product,   // The product being sold
                quantity: item.quantity,   // Quantity of the product
                salePrice: item.rate,   // Price of each product sold (base rate)
                totalAmount: item.amount  // Total sale amount for this product (GST inclusive)
            });
        }

        // Save the updated seller's sales history
        await seller.save();

        next();  // Continue with other operations
    } catch (error) {
        next(error);  // Pass the error to the error handler
    }
});


const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Seller = require("./Seller");
// const Customer = require("./customerModel");

// // Invoice Item Subdocument Schema (with cgst and sgst at item level)
// const invoiceItemSchema = new Schema({
//     product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//     quantity: { type: Number, required: true, min: 1 },
//     discount: { type: Number, default: 0, min: 0 },
//     rate: { type: Number, required: true, min: 0 },
//     taxableValue: { type: Number, required: true, min: 0 },
//     cgstRate: { type: Number, required: true, min: 0 }, // Item-level CGST rate
//     sgstRate: { type: Number, required: true, min: 0 }, // Item-level SGST rate
//     cgstAmount: { type: Number, required: true, min: 0 }, // Item-level CGST amount
//     sgstAmount: { type: Number, required: true, min: 0 }, // Item-level SGST amount
//     amount: { type: Number, required: true, min: 0 },
// });

// // Invoice Schema
// const invoiceSchema = new Schema({
//     invoiceNumber: { type: String, required: true, unique: true },
//     invoiceDate: { type: Date, required: true },
//     dueDate: { type: Date },
//     seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
//     buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
//     items: [invoiceItemSchema],
//     subTotal: { type: Number, required: true, min: 0 },
//     totalDiscount: { type: Number, default: 0, min: 0 },
//     igst: { type: Number, default: 0, min: 0 },
//     cess: { type: Number, default: 0, min: 0 },
//     totalAmount: { type: Number, required: true, min: 0 },
//     paymentTerms: { type: String },
//     notes: { type: String },
//     placeOfSupply: { type: String, required: true },
//     status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true }
// });

// // Pre-save Middleware (Updated Calculations)
// invoiceSchema.pre('save', async function (next) {
//     if (!this.dueDate) {
//         this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days after invoice date
//     }

//     const Product = mongoose.model('Product');
//     let subTotal = 0;
//     let totalDiscount = 0;
//     let totalCgst = 0;
//     let totalSgst = 0;
//     let igst = 0;
//     let cess = 0;

//     try {
//         for (const item of this.items) {
//             const product = await Product.findById(item.product).select('price'); // Only need price now
//             if (!product) throw new Error(`Product with ID ${item.product} not found`);
//             item.rate = item.rate || product.price;
//             item.taxableValue = item.quantity * item.rate;
//             // Calculate CGST and SGST amounts based on rates
//             item.cgstAmount = (item.taxableValue * item.cgstRate) / 100;
//             item.sgstAmount = (item.taxableValue * item.sgstRate) / 100;
//             item.gstAmount = item.cgstAmount + item.sgstAmount; // Total GST amount
//             item.amount = item.taxableValue + item.gstAmount;
//             subTotal += item.taxableValue;
//             totalDiscount += item.discount;
//             totalCgst += item.cgstAmount;
//             totalSgst += item.sgstAmount;
//             igst += 0;
//             cess += 0;
//         }

//         this.subTotal = subTotal;
//         this.totalDiscount = totalDiscount;
//         this.cgst = totalCgst; // Set the invoice-level CGST
//         this.sgst = totalSgst; // Set the invoice-level SGST
//         this.igst = igst;
//         this.cess = cess;
//         this.totalAmount = this.subTotal + this.cgst + this.sgst + this.igst + this.cess - this.totalDiscount;

//         next();
//     } catch (error) {
//         next(error);
//     }
// });

// // Virtuals and Pre-find (for populating)
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
//     this.populate('sellerDetails', '-__v')  // Exclude __v field
//         .populate('buyerDetails', '-__v')
//         .populate('itemDetails', '-__v');
//     next();
// });

// invoiceSchema.post('save', async function (doc, next) {
//     try {
//         // 1. Find the customer (buyer) associated with this invoice
//         const customer = await Customer.findById(doc.buyer);

//         if (!customer) {
//             return next(new Error('Customer not found'));
//         }

//         // 2. Iterate through the items in the invoice and update the customer's cart
//         for (const item of doc.items) {
//             const cartItem = customer.cart.items.find(
//                 (cartItem) => cartItem.productId.toString() === item.product.toString()
//             );

//             if (cartItem) {
//                 cartItem.invoiceIds.push(doc._id);
//             } else {
//                 customer.cart.items.push({
//                     productId: item.product,
//                     invoiceIds: [doc._id],
//                 });
//             }
//         }
//         // 3. Save the updated customer document
//         await customer.save();

//         next();  // Continue with other operations
//     } catch (error) {
//         next(error);  // Pass the error to the error handler
//     }

// });


// invoiceSchema.post('save', async function (doc, next) {
//     try {
//         // Update Seller's Sales History
//         const seller = await Seller.findById(doc.seller);
//         if (!seller) {
//             return next(new Error('Seller not found'));
//         }

//         // Add sales history records to seller's salesHistory
//         for (const item of doc.items) {
//             seller.salesHistory.push({
//                 customer: doc.buyer,  // The customer buying the product
//                 product: item.product,  // The product being sold
//                 quantity: item.quantity,  // Quantity of the product
//                 salePrice: item.rate,  // Price of each product sold
//                 totalAmount: item.amount  // Total sale amount for this product
//             });
//         }

//         // Save the updated seller's sales history
//         await seller.save();

//         next();  // Continue with other operations
//     } catch (error) {
//         next(error);  // Pass the error to the error handler
//     }
// });



// const Invoice = mongoose.model('Invoice', invoiceSchema);
// module.exports = Invoice;


// ==================================================================================

// // /////////////////////////////////////////////////////////////
// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Seller = require("./Seller");
// const Customer = require("./customerModel");

// // Billed Details Subdocument Schema (for billedBy and billedTo)
// const billedDetailsSchema = new Schema({
//     country: { type: String },
//     state: { type: String },
//     businessName: { type: String },
//     phone: { type: String },
//     email: { type: String },
//     gstin: { type: String },
//     address: { type: String },
//     city: { type: String },
//     postalCode: { type: String },
//     billState: { type: String } // You might want to specify enum values for state if applicable
// });

// // Invoice Item Subdocument Schema (with cgst and sgst at item level)
// const invoiceItemSchema = new Schema({
//     product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
//     quantity: { type: Number, required: true, min: 1 },
//     discount: { type: Number, default: 0, min: 0 },
//     rate: { type: Number, required: true, min: 0 },
//     taxableValue: { type: Number, required: true, min: 0 },
//     gstRate: { type: Number, default: 0, min: 0 }, // Overall GST rate for the item
//     cgstRate: { type: Number, default: 0, min: 0 }, // Item-level CGST rate
//     sgstRate: { type: Number, default: 0, min: 0 }, // Item-level SGST rate
//     cgstAmount: { type: Number, required: true, min: 0 }, // Item-level CGST amount
//     sgstAmount: { type: Number, required: true, min: 0 }, // Item-level SGST amount
//     igstAmount: { type: Number, default: 0, min: 0 },     // Item-level IGST amount - Added
//     amount: { type: Number, required: true, min: 0 },
// });

// // Invoice Schema
// const invoiceSchema = new Schema({
//     invoiceNumber: { type: String, required: true, unique: true },
//     invoiceDate: { type: Date, required: true },
//     dueDate: { type: Date },
//     seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
//     buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
//     items: [invoiceItemSchema],
//     subTotal: { type: Number, required: true, min: 0 },
//     totalDiscount: { type: Number, default: 0, min: 0 },
//     igst: { type: Number, default: 0, min: 0 }, // Invoice-level IGST - Added
//     cess: { type: Number, default: 0, min: 0 }, // Invoice-level CESS - Added
//     totalAmount: { type: Number, required: true, min: 0 },
//     paymentTerms: { type: String },
//     notes: { type: String },
//     placeOfSupply: { type: String, required: true },
//     status: { type: String, enum: ['paid', 'unpaid', 'partially paid', 'cancelled'], default: 'unpaid' },
//     metadata: { type: Map, of: Schema.Types.Mixed },
//     billedBy: billedDetailsSchema, // Embed billedBy details
//     billedTo: billedDetailsSchema, // Embed billedTo details
//     roundUp: { type: Boolean, default: false },   // Added roundUp
//     roundDown: { type: Boolean, default: false }, // Added roundDown
//     currency: { type: String, default: 'INR' },  // Added currency, default to INR
// }, {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true }
// });

// // Pre-save Middleware (Updated Calculations)
// invoiceSchema.pre('save', async function (next) {
//     if (!this.dueDate) {
//         this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days after invoice date
//     }

//     const Product = mongoose.model('Product');
//     let subTotal = 0;
//     let totalDiscount = 0;
//     let totalCgst = 0;
//     let totalSgst = 0;
//     let totalIgst = 0; // Initialize totalIgst
//     let totalCess = 0; // Initialize totalCess

//     try {
//         for (const item of this.items) {
//             const product = await Product.findById(item.product).select('price'); // Only need price now
//             if (!product) throw new Error(`Product with ID ${item.product} not found`);
//             item.rate = item.rate || product.price;
//             item.taxableValue = item.quantity * item.rate;
//             // Calculate CGST and SGST amounts based on rates
//             item.cgstAmount = (item.taxableValue * (item.cgstRate || (item.gstRate / 2) || 0)) / 100; // Use item.gstRate if item.cgstRate is not provided
//             item.sgstAmount = (item.taxableValue * (item.sgstRate || (item.gstRate / 2) || 0)) / 100; // Use item.gstRate if item.sgstRate is not provided
//             item.igstAmount = (item.taxableValue * (item.gstRate || 0)) / 100; // Calculate Item-level IGST - Added
//             item.amount = item.taxableValue + item.cgstAmount + item.sgstAmount + item.igstAmount;
//             subTotal += item.taxableValue;
//             totalDiscount += item.discount;
//             totalCgst += item.cgstAmount;
//             totalSgst += item.sgstAmount;
//             totalIgst += item.igstAmount; // Accumulate item-level IGST to invoice-level total
//             totalCess += 0; // Add logic for CESS if needed in items
//         }

//         this.subTotal = subTotal;
//         this.totalDiscount = totalDiscount;
//         this.cgst = totalCgst; // Set the invoice-level CGST
//         this.sgst = totalSgst; // Set the invoice-level SGST
//         this.igst = totalIgst; // Set the invoice-level IGST - Added
//         this.cess = totalCess; // Set the invoice-level CESS - Added (currently 0)
//         this.totalAmount = this.subTotal + this.cgst + this.sgst + this.igst + this.cess - this.totalDiscount;

//         if (this.roundUp) {
//             this.totalAmount = Math.ceil(this.totalAmount);
//         } else if (this.roundDown) {
//             this.totalAmount = Math.floor(this.totalAmount);
//         }

//         next();
//     } catch (error) {
//         next(error);
//     }
// });

// // Virtuals and Pre-find (for populating) - No changes needed here unless you want to populate billedBy/billedTo
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
//     this.populate('sellerDetails', '-__v')     // Exclude __v field
//         .populate('buyerDetails', '-__v')
//         .populate('itemDetails', '-__v');
//     next();
// });

// invoiceSchema.post('save', async function (doc, next) {
//     try {
//         // 1. Find the customer (buyer) associated with this invoice
//         const customer = await Customer.findById(doc.buyer);

//         if (!customer) {
//             return next(new Error('Customer not found'));
//         }

//         // 2. Iterate through the items in the invoice and update the customer's cart
//         for (const item of doc.items) {
//             const cartItem = customer.cart.items.find(
//                 (cartItem) => cartItem.productId.toString() === item.product.toString()
//             );

//             if (cartItem) {
//                 cartItem.invoiceIds.push(doc._id);
//             } else {
//                 customer.cart.items.push({
//                     productId: item.product,
//                     invoiceIds: [doc._id],
//                 });
//             }
//         }
//         // 3. Save the updated customer document
//         await customer.save();

//         next();     // Continue with other operations
//     } catch (error) {
//         next(error);     // Pass the error to the error handler
//     }

// });


// invoiceSchema.post('save', async function (doc, next) {
//     try {
//         // Update Seller's Sales History
//         const seller = await Seller.findById(doc.seller);
//         if (!seller) {
//             return next(new Error('Seller not found'));
//         }

//         // Add sales history records to seller's salesHistory
//         for (const item of doc.items) {
//             seller.salesHistory.push({
//                 customer: doc.buyer,     // The customer buying the product
//                 product: item.product,     // The product being sold
//                 quantity: item.quantity,     // Quantity of the product
//                 salePrice: item.rate,     // Price of each product sold
//                 totalAmount: item.amount     // Total sale amount for this product
//             });
//         }

//         // Save the updated seller's sales history
//         await seller.save();

//         next();     // Continue with other operations
//     } catch (error) {
//         next(error);     // Pass the error to the error handler
//     }
// });


// const Invoice = mongoose.model('Invoice', invoiceSchema);
// module.exports = Invoice;