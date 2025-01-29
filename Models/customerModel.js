
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Invoice=require('./invoiceModel')
// const paymentSchema=require('./paymentModel')
// const cartItemSchema=require('./cartmodel')
// const Payment = mongoose.model("Payment", paymentSchema);

const cartItemSchema = new Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product",  },
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
});
const customerSchema = new Schema({
    // customerId: { type: mongoose.Schema.Types.ObjectId },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    status: {type: String, enum: ["active", "inactive", "pending", "suspended", "blocked"], default: "pending",},
    email: { type: String, unique: true, match: /.+\@.+\..+/ },
    fullname: { type: String, required: true },
    phoneNumbers: [{ number: { type: String, required: true }, type: { type: String, enum: ["home", "mobile", "work"], required: true }, primary: { type: Boolean, default: false } },],
    addresses: [{ street: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true }, zipCode: { type: String, required: true }, country: { type: String, required: true }, type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true }, isDefault: { type: Boolean, default: false } },],
    cart: { items: [cartItemSchema] },
    guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",required:false },
    totalPurchasedAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number },
    paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });


customerSchema.pre(/^find/, async function (next) {
    this.populate({ path: "cart.items.productId", select: "-__v" });
    this.populate({ path: "cart.items.invoiceIds", select: "amount" });
    this.populate("paymentHistory");
    next();
});
customerSchema.post('save', async function (doc) {
    await calculateTotalPurchasedAmount(doc._id);
    await calculateRemainingAmount(doc._id);
});
customerSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        await calculateTotalPurchasedAmount(doc._id);
        await calculateRemainingAmount(doc._id);
    }
});
customerSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await calculateTotalPurchasedAmount(doc._id);
        await calculateRemainingAmount(doc._id);
    }
});

async function calculateTotalPurchasedAmount(customerId) {
    try {
        const customer = await Customer.findById(customerId).populate({ 
            path: "cart.items.invoiceIds",
            select: "amount",
        });
        if (!customer) {
            console.error("Customer not found");
            return;
        }
        let totalAmount = 0;
        if (customer.cart && customer.cart.items) {
            customer.cart.items.forEach(item => {
                if (item.invoiceIds) {
                    item.invoiceIds.forEach(invoice => {
                        if (invoice && invoice.amount) {
                            totalAmount += invoice.amount;
                        }
                    });
                }
            });
        }

        customer.totalPurchasedAmount = totalAmount;
        await customer.save();
    } catch (error) {
        console.error("Error calculating total purchased amount:", error);
    }
}

async function calculateRemainingAmount(customerId) {
    try {
        const customer = await Customer.findById(customerId).populate('paymentHistory');
        if (!customer) {
            console.log("customer not found");
            return;
        }
        let totalPaid = 0;
        if (customer.paymentHistory) {
            customer.paymentHistory.forEach(payment => {
                totalPaid += payment.amount;
            });
        }
        customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
        await customer.save();
    } catch (err) {
        console.log("error in calculating remaining amount", err);
    }
}
module.exports= mongoose.model("Customer", customerSchema);
// ================================================================================
/*
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Payment Schema
const paymentSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 }, // Add min validation
    paymentMethod: { type: String, enum: ['card', 'cash', 'upi', 'netBanking'], default: 'cash' },
    transactionId: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);

// Cart Item Schema (No changes needed here)
const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: "Invoice" }],
});

// Customer Schema
const customerSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId },
    // ... (other fields)
    cart: { items: [cartItemSchema] },
    guaranteerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    totalPurchasedAmount: { type: Number, default: 0, min: 0 }, // Add min validation
    remainingAmount: { type: Number },
    paymentHistory: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
    metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

// Refactored Calculation Logic (Using aggregation)
customerSchema.statics.updateCustomerBalances = async function (customerId) {
    try {
        const result = await this.aggregate([
            { $match: { _id: customerId } },
            {
                $lookup: {
                    from: "payments", // Collection name for payments
                    localField: "paymentHistory",
                    foreignField: "_id",
                    as: "payments"
                }
            },
            {
                $unwind: {
                    path: '$cart.items',
                    preserveNullAndEmptyArrays: true // Important for customers with empty carts
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: 'cart.items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: {
                    path: '$cart.items.invoiceIds',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "invoices",
                    localField: 'cart.items.invoiceIds',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            {
              $unwind:{
                path:'$invoice',
                preserveNullAndEmptyArrays:true
              }
            },
            {
                $group: {
                    _id: "$_id",
                    totalPurchasedAmount: { $sum: { $ifNull: ['$invoice.amount',0] } },
                    totalPaid: { $sum: { $ifNull: ['$payments.amount',0] } },
                    paymentHistory:{$first:'$paymentHistory'}
                }
            },
            {
                $project: {
                    _id: 1,
                    totalPurchasedAmount:1,
                    remainingAmount: { $subtract: ["$totalPurchasedAmount", "$totalPaid"] },
                    paymentHistory:1
                }
            },
            { $merge: { into: "customers", on: "_id", whenMatched: "replace" } }
        ]);
        if(!result || result.length === 0){
          console.log("customer not found")
        }
    } catch (error) {
        console.error("Error updating customer balances:", error);
    }
};

// Update post hooks to use the static method
customerSchema.post(['save', 'findOneAndUpdate', 'findOneAndDelete'], async function (doc) {
    if (doc) {
        await this.constructor.updateCustomerBalances(doc._id); // Use this.constructor
    }
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = { Customer, Payment };

*/
// 
// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const User = require("./UserModel");
// const Review = require("./ReviewModel");
// const Product = require("./productModel");

// // Define the Cart Item Schema (for internal use)
// const cartItemSchema = new Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   invoiceIds: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Invoice",
//     },
//   ],
// });

// // Define the Customer Schema
// const customerSchema = new Schema(
//   {
//     customerId: {type: mongoose.Schema.Types.ObjectId, // unique: true
//     },
//     createdAt: { type: Date, required: true, default: Date.now, },
//     updatedAt: {
//       type: Date,
//       required: true,
//       default: Date.now,
//     },
//     status: {
//       type: String,
//       enum: ["active", "inactive", "pending", "suspended", "blocked"],
//       default: "pending",
//     },
//     email: {
//       type: String,
//       unique: true,
//       match: /.+\@.+\..+/, // Email validation
//     },
//     fullname: {
//       type: String,
//       required: true,
//     },
//     phoneNumbers: [
//       {
//         number: { type: String, required: true },
//         type: {
//           type: String,
//           enum: ["home", "mobile", "work"],
//           required: true,
//         },
//         primary: { type: Boolean, default: false },
//       },
//     ],
//     addresses: [
//       {
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: {
//           type: String,
//           enum: ["billing", "shipping", "home", "work"],
//           required: true,
//         },
//         isDefault: { type: Boolean, default: false },
//       },
//     ],
//     cart: {
//       items: [cartItemSchema],
//     },
//     guaranteer:{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Customer",
//     },
//     remainingAmount:{
//       type: Number,
//     },
//     paymentHistory:{
//       type:Array,
//       default:[]
//     },
//     metadata: {
//       type: Map,
//       of: Schema.Types.Mixed, // Allows any type of additional metadata
//     },
//   },
//   {
//     timestamps: true, // Automatically adds createdAt and updatedAt fields
//   }
// );

// customerSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "cart.items.productId", // Correct path to populate productId
//     select: "-__v", // Optional: exclude specific fields from the populated data
//   });
//   next();
// });

// const Customer = mongoose.model("Customer", customerSchema);

// module.exports = Customer;
