const mongoose = require('mongoose');
const { Schema } = mongoose;
const Seller = require("./Seller");
const Customer = require("./customerModel");

// Invoice Item Subdocument Schema (with cgst and sgst at item level)
const invoiceItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    cgstRate: { type: Number, required: true, min: 0 }, // Item-level CGST rate
    sgstRate: { type: Number, required: true, min: 0 }, // Item-level SGST rate
    cgstAmount: { type: Number, required: true, min: 0 }, // Item-level CGST amount
    sgstAmount: { type: Number, required: true, min: 0 }, // Item-level SGST amount
    amount: { type: Number, required: true, min: 0 },
});

// Invoice Schema
const invoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [invoiceItemSchema],
    subTotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    cess: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
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

// Pre-save Middleware (Updated Calculations)
invoiceSchema.pre('save', async function (next) {
    if (!this.dueDate) {
        this.dueDate = new Date(this.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days after invoice date
    }

    const Product = mongoose.model('Product');
    let subTotal = 0;
    let totalDiscount = 0;
    let totalCgst = 0; 
    let totalSgst = 0; 
    let igst = 0;
    let cess = 0;

    try {
        for (const item of this.items) {
            const product = await Product.findById(item.product).select('price'); // Only need price now
            if (!product) throw new Error(`Product with ID ${item.product} not found`);

            item.rate = item.rate || product.price;
            item.taxableValue = item.quantity * item.rate;

            // Calculate CGST and SGST amounts based on rates
            item.cgstAmount = (item.taxableValue * item.cgstRate) / 100;
            item.sgstAmount = (item.taxableValue * item.sgstRate) / 100;
            item.gstAmount = item.cgstAmount + item.sgstAmount; // Total GST amount
            item.amount = item.taxableValue + item.gstAmount;

            subTotal += item.taxableValue;
            totalDiscount += item.discount;
            totalCgst += item.cgstAmount; 
            totalSgst += item.sgstAmount; 
            igst += 0; 
            cess += 0;
        }

        this.subTotal = subTotal;
        this.totalDiscount = totalDiscount;
        this.cgst = totalCgst; // Set the invoice-level CGST
        this.sgst = totalSgst; // Set the invoice-level SGST
        this.igst = igst;
        this.cess = cess;
        this.totalAmount = this.subTotal + this.cgst + this.sgst + this.igst + this.cess - this.totalDiscount;

        next();
    } catch (error) {
        next(error);
    }
});

// Virtuals and Pre-find (for populating)
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
    this.populate('sellerDetails', '-__v')  // Exclude __v field
        .populate('buyerDetails', '-__v')
        .populate('itemDetails', '-__v');
    next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
