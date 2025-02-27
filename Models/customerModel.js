// customerModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Invoice = require('./invoiceModel');
const Product = require('./productModel');
const customerSchema = new Schema({
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ["active", "inactive", "pending", "suspended", "blocked"],
        default: "pending",
    },
    profileImg: { type: String },
    email: { type: String, unique: true, match: /.+\@.+\..+/ },
    fullname: { type: String, required: true },
    phoneNumbers: [{
        number: { type: String, required: true },
        type: { type: String, enum: ["home", "mobile", "work"], required: true },
        primary: { type: Boolean, default: false }
    }],
    addresses: [{
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
        isDefault: { type: Boolean, default: false }
    }],
    cart: {
        items: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
            },
        ],
    },
    guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
    totalPurchasedAmount: { type: Number },
    remainingAmount: { type: Number, default: 0 },
    paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

// Consolidated pre-find hook for population
customerSchema.pre(/^find/, function (next) {
    this.populate([
        {
            path: 'cart.items.productId',
            select: 'title finalPrice thumbnail description name price'
        },
        {
            path: 'cart.items.invoiceIds',
            select: 'invoiceNumber totalAmount invoiceDate status amount date'
        },
        {
            path: 'paymentHistory',
            select: 'amount status createdAt transactionId'
        }
    ]);
    next();
});

// Virtuals and Pre / Post hooks(no changes needed)
// customerSchema.virtual('sellerDetails', {
//     ref: 'Product',
//     localField: 'cart.items.productId',
//     foreignField: '_id',
//     justOne: true
// });
// customerSchema.virtual('buyerDetails', {
//     ref: 'Invoice',
//     localField: 'cart.items.invoiceIds',
//     foreignField: '_id',
//     justOne: true
// });
// customerSchema.virtual('paymentdetails', {
//     ref: Product,
//     localField: 'paymentHistory',
//     foreignField: '_id'
// });

// customerSchema.pre(/^find/, function (next) {
//     this.populate('sellerDetails', '-__v')
//         .populate('buyerDetails', '-__v')
//         .populate('paymentdetails', '-__v');
//     next();
// });
// --- Aggregation functions (same as your existing ones) ---
async function calculateTotalPurchasedAmount(customerId) {
    try {
        const Customer = mongoose.model('Customer');
        const customer = await Customer.findById(customerId);
        if (!customer) {
            console.error("Customer not found");
            return;
        }
        const aggregationResult = await Customer.aggregate([
            { $match: { _id: customer._id } },
            {
                $lookup: {
                    from: 'invoices',
                    localField: 'cart.items.invoiceIds',
                    foreignField: '_id',
                    as: 'invoices'
                }
            },
            { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } }
                }
            },
            { $project: { _id: 0, totalAmount: 1 } }
        ]);
        let totalPurchasedAmount = 0;
        if (aggregationResult.length > 0) {
            totalPurchasedAmount = aggregationResult[0].totalAmount || 0;
        }
        customer.totalPurchasedAmount = totalPurchasedAmount;
        await customer.save();
    } catch (error) {
        console.error("Error calculating total purchased amount:", error);
    }
}
async function calculateRemainingAmount(customerId) {
    try {
        const Customer = mongoose.model('Customer');
        const customer = await Customer.findById(customerId);
        if (!customer) {
            console.log("Customer not found");
            return;
        }

        // Fetch only completed payments and sum their amounts
        const paymentAggregationResult = await Customer.aggregate([
            { $match: { _id: customer._id } },
            {
                $lookup: {
                    from: 'payments',
                    localField: 'paymentHistory',
                    foreignField: '_id',
                    as: 'payments'
                }
            },
            { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
            // { $match: { 'payments.status': 'completed' } }, // Only include completed payments
            {
                $group: {
                    _id: '$_id',
                    totalPaid: { $sum: { $ifNull: ['$payments.amount', 0] } }
                }
            }
        ]);

        // Ensure values exist
        const totalPaid = paymentAggregationResult.length > 0 ? paymentAggregationResult[0].totalPaid : 0;
        const totalPurchased = customer.totalPurchasedAmount || 0;

        // Calculate remaining amount (ensuring it does not go negative)
        customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);
        await customer.save();
    } catch (err) {
        console.error("Error calculating remaining amount:", err);
    }
}

customerSchema.statics.updateRemainingAmount = async function (customerId) {
    try {
        const Customer = mongoose.model("Customer");

        // Find the customer and populate payment history
        const customer = await Customer.findById(customerId).populate("paymentHistory");
        if (!customer) {
            console.error("Customer not found");
            return null;
        }

        // Sum amounts of payments with status "completed"
        const totalPaid = customer.paymentHistory
            // .filter(payment => payment.status === "completed")
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);

        // Ensure totalPurchasedAmount exists
        const totalPurchased = customer.totalPurchasedAmount || 0;

        // Calculate remaining amount with non-negative constraint
        customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);

        await customer.save();
        return customer;
    } catch (error) {
        console.error("Error updating remaining amount:", error);
        return null;
    }
};

// async function calculateRemainingAmount(customerId) {
//     try {
//         const Customer = mongoose.model('Customer');
//         const customer = await Customer.findById(customerId);
//         if (!customer) {
//             console.log("Customer not found");
//             return;
//         }
//         const paymentAggregationResult = await Customer.aggregate([
//             { $match: { _id: customer._id } },
//             {
//                 $lookup: {
//                     from: 'payments',
//                     localField: 'paymentHistory',
//                     foreignField: '_id',
//                     as: 'payments'
//                 }
//             },
//             { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
//             // { $match: { 'payments.status': 'completed' } },
//             {
//                 $group: {
//                     _id: '$_id',
//                     totalPaid: { $sum: { $ifNull: ['$payments.amount', 0] } }
//                 }
//             },
//             { $project: { _id: 0, totalPaid: 1 } }
//         ]);
//         let totalPaid = 0;
//         if (paymentAggregationResult.length > 0) {
//             totalPaid = paymentAggregationResult[0].totalPaid || 0;
//         }
//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error calculating remaining amount:", err);
//     }
// }

// --- Static method to get the user with updated totals ---
customerSchema.statics.getUserWithTotals = async function (query) {
    // Find the user
    let user = await this.findOne(query);
    if (!user) return null;

    // Explicitly recalculate totals
    await calculateTotalPurchasedAmount(user._id);
    await calculateRemainingAmount(user._id);

    // Re-fetch the updated user with population
    user = await this.findById(user._id);
    return user;
};

// // In customerModel.js
// customerSchema.statics.updateRemainingAmount = async function (customerId) {
//     try {
//         const Customer = mongoose.model("Customer");
//         // Find the customer with payment history populated
//         const customer = await Customer.findById(customerId).populate("paymentHistory");
//         if (!customer) {
//             console.error("Customer not found");
//             return null;
//         }

//         // Sum amounts for payments with status "completed"
//         const totalPaid = customer.paymentHistory
//             .filter(payment => payment.status === "completed")
//             .reduce((sum, payment) => sum + (payment.amount || 0), 0);

//         // Calculate remaining amount (ensure it does not go negative)
//         const remaining = customer.totalPurchasedAmount - totalPaid;
//         customer.remainingAmount = remaining < 0 ? 0 : remaining;

//         await customer.save();
//         return customer;
//     } catch (error) {
//         console.error("Error updating remaining amount:", error);
//         return null;
//     }
// };



module.exports = mongoose.model('Customer', customerSchema);


// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Invoice = require('./invoiceModel');
// const Product = require('./productModel');

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     profileImg: { type: String },
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     cart: {
//         items: [
//             {
//                 productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
//                 invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
//             },
//         ],
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number},
//     remainingAmount: { type: Number, default: 0 },
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, 
// { timestamps: true });

// /**
//  * Consolidated pre-find hook that populates:
//  * - Product details for cart items
//  * - Invoice details for cart items
//  * - Payment history
//  */
// customerSchema.pre(/^find/, function (next) {
//     this.populate([
//         {
//             path: 'cart.items.productId',
//             select: 'title finalPrice thumbnail description name price'
//         },
//         {
//             path: 'cart.items.invoiceIds',
//             select: 'invoiceNumber totalAmount invoiceDate status amount date'
//         },
//         {
//             path: 'paymentHistory',
//             select: 'amount status createdAt transactionId'
//         }
//     ]);
//     next();
// });

// /**
//  * Post-save and post-findOneAndUpdate hooks trigger recalculation of:
//  * - Total purchased amount (from invoices)
//  * - Remaining amount (total purchased minus completed payments)
//  */
// customerSchema.post('save', async function (doc) {
//     console.log("post('save') hook triggered for customerId:", doc._id);
//     try {
//         console.log(doc.Id,"IIIIIIIIIIIIDDDDDDDDDDd");
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     } catch (error) {
//         console.error("Error during post-save calculations:", error);
//     }
// });

// customerSchema.post('findOneAndUpdate', async function (doc) {
//     console.log("post('findOneAndUpdate') hook triggered for doc:", doc);
//     if (doc) {
//         try {
//             await calculateTotalPurchasedAmount(doc._id);
//             await calculateRemainingAmount(doc._id);
//         } catch (error) {
//             console.error("Error during post-update calculations:", error);
//         }
//     }
// });

// customerSchema.statics.getUserWithTotals = async function (query) {
//     // Find the user first
//     let user = await this.findOne(query);
//     if (!user) return null;

//     // Recalculate totals explicitly
//     await calculateTotalPurchasedAmount(user._id);
//     await calculateRemainingAmount(user._id);

//     // Re-fetch the user with updated values and populated fields
//     user = await this.findById(user._id);
//     return user;
// };

// /**
//  * Aggregation function to calculate totalPurchasedAmount.
//  * It looks up all invoices from the customer's cart and sums their totalAmount.
//  */
// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const Customer = mongoose.model('Customer');
//         const customer = await Customer.findById(customerId);
//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         const aggregationResult = await Customer.aggregate([
//             { $match: { _id: customer._id } },
//             {
//                 $lookup: {
//                     from: 'invoices', // Ensure this matches your Invoice collection name
//                     localField: 'cart.items.invoiceIds',
//                     foreignField: '_id',
//                     as: 'invoices'
//                 }
//             },
//             { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } },
//             {
//                 $group: {
//                     _id: '$_id',
//                     totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } }
//                 }
//             },
//             { $project: { _id: 0, totalAmount: 1 } }
//         ]);

//         let totalPurchasedAmount = 0;
//         if (aggregationResult.length > 0) {
//             totalPurchasedAmount = aggregationResult[0].totalAmount || 0;
//         }

//         customer.totalPurchasedAmount = totalPurchasedAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount using aggregation:", error);
//     }
// }

// /**
//  * Aggregation function to calculate remainingAmount.
//  * It looks up all completed payments from paymentHistory and subtracts the totalPaid from totalPurchasedAmount.
//  */
// async function calculateRemainingAmount(customerId) {
//     try {
//         const Customer = mongoose.model('Customer');
//         const customer = await Customer.findById(customerId);
//         if (!customer) {
//             console.log("Customer not found");
//             return;
//         }

//         const paymentAggregationResult = await Customer.aggregate([
//             { $match: { _id: customer._id } },
//             {
//                 $lookup: {
//                     from: 'payments', // Ensure this matches your Payment collection name
//                     localField: 'paymentHistory',
//                     foreignField: '_id',
//                     as: 'payments'
//                 }
//             },
//             { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
//             { $match: { 'payments.status': 'completed' } },
//             {
//                 $group: {
//                     _id: '$_id',
//                     totalPaid: { $sum: { $ifNull: ['$payments.amount', 0] } }
//                 }
//             },
//             { $project: { _id: 0, totalPaid: 1 } }
//         ]);

//         let totalPaid = 0;
//         if (paymentAggregationResult.length > 0) {
//             totalPaid = paymentAggregationResult[0].totalPaid || 0;
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error calculating remaining amount using aggregation:", err);
//     }
// }

// module.exports = mongoose.model('Customer', customerSchema);


// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Invoice = require('./invoiceModel')
// const Product=require('./productModel')
// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  // Link to the Product schema
// //         required: true 
// //     },
// //     invoiceIds: [{  // Array of ObjectIds - **IS IT DEFINED LIKE THIS?**
// //         type: mongoose.Schema.Types.ObjectId,
// //         ref: "Invoice"
// //     }],
// // });

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     profileImg:{type:String},
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     // cart.items.productId
//     cart: {
//         items: [
//             {
//                 productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
//                 invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
//             },
//         ],
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
    
// }, 
// { timestamps: true });

// // 
// module.exports = mongoose.model('Customer', customerSchema);

// customerSchema.pre(/^find/, function (next) {
//     this.populate({
//         path: 'cart.items.productId',
//         select: 'title finalPrice thumbnail -_id', // Exclude _id if not needed
//     })
//         .populate({
//             path: 'cart.items.invoiceIds',
//             select: 'invoiceNumber totalAmount -_id',
//         })
//         .populate({
//             path: 'paymentHistory',
//             select: 'amount status -_id',
//         });
//     next();
// });

// customerSchema.pre(/^find/, function (next) {
//     this.populate({
//         path: 'cart.items.productId',
//         select: 'title finalPrice thumbnail description name price', // Include all needed fields
//     })
//         .populate({
//             path: 'cart.items.invoiceIds',
//             select: 'invoiceNumber totalAmount invoiceDate status amount date', // Include all needed fields
//         })
//         .populate({
//             path: 'paymentHistory',
//             select: 'amount status createdAt transactionId', // Include all needed fields
//         });
//     next();
// });


// // Pre-find Hook to populate cart items, products, and invoices
// customerSchema.pre(/^find/, async function(next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price",  // Only select necessary fields from Product
//     })
//     .populate({
//         path: "cart.items.invoiceIds",
//         select: "amount date",  // Select only necessary fields from Invoice
//     })
//     .populate("paymentHistory");  // Populate paymentHistory if needed
//     next();
// });
// customerSchema.pre(/^find/, function (next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price", // Populate product data
//     })
//         .populate({
//             path: "cart.items.invoiceIds",
//             select: "amount date", // Populate invoice data
//         })
//         .populate("paymentHistory");
//     next();
// });

// customerSchema.post('save', async function (doc) {
//     console.log("post('save') hook in customerSchema is triggered for customerId:", doc._id);
//     try {
//         await calculateTotalPurchasedAmount(doc._id); // Use aggregation-based function
//         await calculateRemainingAmount(doc._id);     // Use aggregation-based function
//     } catch (error) {
//         console.error("Error during post-save calculations:", error);
//     }
// });

// customerSchema.post('findOneAndUpdate', async function (doc) {
//     console.log("post('findOneAndUpdate') hook in customerSchema is triggered for doc:", doc);
//     if (doc) {
//         try {
//             await calculateTotalPurchasedAmount(doc._id); // Use aggregation-based function
//             await calculateRemainingAmount(doc._id);     // Use aggregation-based function
//         } catch (error) {
//             console.error("Error during post-update calculations:", error);
//         }
//     }
// });
// // customerSchema.post('save', async function (doc) {
// //     console.log("post('save') hook in customerSchema is triggered for customerId:", doc._id); // ADD THIS LINE
// //     try {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     } catch (error) {
// //         console.error("Error during post-save calculations:", error);
// //     }
// // });

// // // Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     console.log("post('findOneAndUpdate') hook in customerSchema is triggered for doc:", doc); // ADD THIS LINE
// //     if (doc) {
// //         try {
// //             await calculateTotalPurchasedAmount(doc._id);
// //             await calculateRemainingAmount(doc._id);
// //         } catch (error) {
// //             console.error("Error during post-update calculations:", error);
// //         }
// //     }
// // });

// // 
// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId);
//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         const aggregationResult = await Customer.aggregate([
//             {
//                 $match: { _id: customer._id } // Match the specific customer
//             },
//             {
//                 $lookup: {
//                     from: 'invoices', //  collection name for Invoice model
//                     localField: 'cart.items.invoiceIds',
//                     foreignField: '_id',
//                     as: 'invoices'
//                 }
//             },
//             {
//                 $unwind: '$invoices' // Deconstruct the invoices array
//             },
//             {
//                 $group: {
//                     _id: '$_id', // Group by customer ID
//                     totalAmount: { $sum: '$invoices.totalAmount' } // Sum invoice totalAmounts
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0, // Exclude _id from output
//                     totalAmount: 1 // Include totalAmount
//                 }
//             }
//         ]);

//         let totalPurchasedAmount = 0;
//         if (aggregationResult.length > 0) {
//             totalPurchasedAmount = aggregationResult[0].totalAmount || 0; // Extract totalAmount, default to 0 if no invoices
//         }

//         customer.totalPurchasedAmount = totalPurchasedAmount;
//         await customer.save();

//     } catch (error) {
//         console.error("Error calculating total purchased amount using aggregation:", error);
//     }
// }


// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId);
//         if (!customer) {
//             console.log("Customer not found");
//             return;
//         }

//         // Aggregate to calculate totalPaid from paymentHistory
//         const paymentAggregationResult = await Customer.aggregate([
//             {
//                 $match: { _id: customer._id } // Match the specific customer
//             },
//             {
//                 $lookup: {
//                     from: 'payments', // collection name for Payment model
//                     localField: 'paymentHistory',
//                     foreignField: '_id',
//                     as: 'payments'
//                 }
//             },
//             {
//                 $unwind: '$payments' // Deconstruct the payments array
//             },
//             {
//                 $match: { 'payments.status': 'completed' } // Filter for completed payments only
//             },
//             {
//                 $group: {
//                     _id: '$_id', // Group by customer ID
//                     totalPaid: { $sum: '$payments.amount' } // Sum amounts of completed payments
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0, // Exclude _id
//                     totalPaid: 1 // Include totalPaid
//                 }
//             }
//         ]);

//         let totalPaid = 0;
//         if (paymentAggregationResult.length > 0) {
//             totalPaid = paymentAggregationResult[0].totalPaid || 0; // Extract totalPaid, default to 0 if no payments
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();

//     } catch (err) {
//         console.log("Error calculating remaining amount using aggregation:", err);
//     }
// }

// // // Function to calculate the total purchased amount
// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({
// //             path: "cart.items.invoiceIds",
// //             select: "amount",
// //         });

// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }

// //         const totalAmount = customer.cart.items.reduce((acc, item) => {
// //             if (item.invoiceIds) {
// //                 item.invoiceIds.forEach(invoice => {
// //                     if (invoice && invoice.amount) {
// //                         acc += invoice.amount;
// //                     }
// //                 });
// //             }
// //             return acc;
// //         }, 0);

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // Function to calculate the remaining amount
// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("Customer not found");
// //             return;
// //         }

// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => { // Directly use 'payment'
// //                 if (payment && payment.status === 'completed') { // Keep status check if needed
// //                     totalPaid += payment.amount;
// //                 }
// //             });
// //         }

// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("Error calculating remaining amount:", err);
// //     }
// // }





// // Ensure findById triggers the hook
// // customerSchema.pre('findOne', function (next) {
// //     this.populate({
// //         path: 'cart.items.productId',
// //         select: 'title finalPrice thumbnail description',
// //     })
// //         .populate({
// //             path: 'cart.items.invoiceIds',
// //             select: 'invoiceNumber totalAmount invoiceDate status',
// //         })
// //         .populate({
// //             path: 'paymentHistory',
// //             select: 'amount status createdAt transactionId',
// //         });
// //     next();
// // });



// /**const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Product =require('./productModel');
// const Invoice=require('./invoiceModel')
// const cartItemSchema = new Schema({
//     productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: Product, 
//         required: true
//     },
//     invoiceIds: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: Invoice  // Link to the Invoice schema
//     }],
// });

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     profileImg: { type: String },
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     cart: {
//         items: { type: [cartItemSchema], default: [] }  // Default empty array
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },

// },
//     { timestamps: true });



// module.exports = mongoose.model('Customer', customerSchema);

// // Pre-find Hook to populate cart items, products, and invoices
// // customerSchema.pre(/^find/, async function (next) {
// //     this.populate({
// //         path: "cart.items.productId",
// //         select: "name price",  // Only select necessary fields from Product
// //     })
// //         .populate({
// //             path: "cart.items.invoiceIds",
// //             select: "amount date",  // Select only necessary fields from Invoice
// //         })
// //         .populate("paymentHistory");  // Populate paymentHistory if needed
// //     next();
// // });
// customerSchema.pre(/^find/, async function (next) {
//     console.log("--- Populating Query ---");
//     console.log("Query filters:", this.getFilter());

//     this.populate({
//         path: "cart.items.productId",
//         select: "name price _id",
//     })
//         .populate({
//             path: "cart.items.invoiceIds",
//             select: "amount date",
//         })
//         .populate("paymentHistory")
//         .then(() => {
//             console.log("--- Population Attempted Successfully ---");
//             next(); // Call next() in .then() to proceed after population setup
//         })
//         .catch(err => {
//             console.error("Population Error:", err);
//             next(err); // Pass any population errors to next(err) for error handling
//         });

//     console.log("--- Population Setup Initiated (next() will be called later) ---");
//     // Do NOT call next() here directly outside the .then()/.catch()
// });

// // Post-save Hook to recalculate the total and remaining amounts
// customerSchema.post('save', async function (doc) {
//     try {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     } catch (error) {
//         console.error("Error during post-save calculations:", error);
//     }
// });

// // Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         try {
//             await calculateTotalPurchasedAmount(doc._id);
//             await calculateRemainingAmount(doc._id);
//         } catch (error) {
//             console.error("Error during post-update calculations:", error);
//         }
//     }
// });



// // Function to calculate the total purchased amount
// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         // Corrected line: use lowercase 'customer'
//         const customer = await mongoose.model('Customer').findById(customerId).populate({
//             path: "cart.items.invoiceIds",
//             select: "amount",
//         });

//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         const totalAmount = customer.cart.items.reduce((acc, item) => {
//             if (item.invoiceIds) {
//                 item.invoiceIds.forEach(invoice => {
//                     console.log("Invoice in totalPurchasedAmount:", invoice); // Log invoice object
//                     if (invoice && invoice.amount) {
//                         acc += invoice.amount;
//                     }
//                 });
//             }
//             return acc;
//         }, 0);

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// // Function to calculate the remaining amount
// async function calculateRemainingAmount(customerId) {
//     try {
//         // Corrected line: use lowercase 'customer'
//         const customer = await mongoose.model('Customer').findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }

//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error in calculating remaining amount", err);
//     }
// }

// // const mongoose = require('mongoose');
// // const { Schema } = mongoose;

// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  // Link to the Product schema
// //         required: true 
// //     },
// //     invoiceIds: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Invoice"  // Link to the Invoice schema
// //     }],
// // });

// // const customerSchema = new Schema({
// //     createdAt: { type: Date, required: true, default: Date.now },
// //     updatedAt: { type: Date, required: true, default: Date.now },
// //     status: {
// //         type: String,
// //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// //         default: "pending",
// //     },
// //     profileImg:{type:String},
// //     email: { type: String, unique: true, match: /.+\@.+\..+/ },
// //     fullname: { type: String, required: true },
// //     phoneNumbers: [{
// //         number: { type: String, required: true },
// //         type: { type: String, enum: ["home", "mobile", "work"], required: true },
// //         primary: { type: Boolean, default: false }
// //     }],
// //     addresses: [{
// //         street: { type: String, required: true },
// //         city: { type: String, required: true },
// //         state: { type: String, required: true },
// //         zipCode: { type: String, required: true },
// //         country: { type: String, required: true },
// //         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
// //         isDefault: { type: Boolean, default: false }
// //     }],
// //     cart: {
// //         items: { type: [cartItemSchema], default: [] }  // Default empty array
// //     },
// //     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
// //     totalPurchasedAmount: { type: Number, default: 0 },
// //     remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
// //     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
// //     metadata: { type: Map, of: Schema.Types.Mixed },
    
// // }, 
// // { timestamps: true });



// // module.exports = mongoose.model('Customer', customerSchema);

// // // Pre-find Hook to populate cart items, products, and invoices
// // customerSchema.pre(/^find/, async function(next) {
// //     this.populate({
// //         path: "cart.items.productId",
// //         select: "name price",  // Only select necessary fields from Product
// //     })
// //     .populate({
// //         path: "cart.items.invoiceIds",
// //         select: "amount date",  // Select only necessary fields from Invoice
// //     })
// //     .populate("paymentHistory");  // Populate paymentHistory if needed
// //     next();
// // });

// // // Post-save Hook to recalculate the total and remaining amounts
// // customerSchema.post('save', async function (doc) {
// //     try {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     } catch (error) {
// //         console.error("Error during post-save calculations:", error);
// //     }
// // });

// // // Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     if (doc) {
// //         try {
// //             await calculateTotalPurchasedAmount(doc._id);
// //             await calculateRemainingAmount(doc._id);
// //         } catch (error) {
// //             console.error("Error during post-update calculations:", error);
// //         }
// //     }
// // });



// // // Function to calculate the total purchased amount
// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({
// //             path: "cart.items.invoiceIds",
// //             select: "amount",
// //         });

// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }

// //         const totalAmount = customer.cart.items.reduce((acc, item) => {
// //             if (item.invoiceIds) {
// //                 item.invoiceIds.forEach(invoice => {
// //                     console.log("Invoice in totalPurchasedAmount:", invoice); // Log invoice object
// //                     if (invoice && invoice.amount) {
// //                         acc += invoice.amount;
// //                     }
// //                 });
// //             }
// //             return acc;
// //         }, 0);
        
// //         // const totalAmount = customer.cart.items.reduce((acc, item) => {
// //         //     if (item.invoiceIds) {
// //         //         item.invoiceIds.forEach(invoice => {
// //         //             if (invoice && invoice.amount) {
// //         //                 acc += invoice.amount;
// //         //             }
// //         //         });
// //         //     }
// //         //     return acc;
// //         // }, 0);

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // // Function to calculate the remaining amount
// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("customer not found");
// //             return;
// //         }

// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => {
// //                 totalPaid += payment.amount;
// //             });
// //         }

// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("Error in calculating remaining amount", err);
// //     }
// // }



// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  
// //         required: true 
// //     },
// //     invoiceIds: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Invoice"  
// //     }],
// // });

// // const customerSchema = new Schema({
// //     createdAt: { type: Date, required: true, default: Date.now },
// //     updatedAt: { type: Date, required: true, default: Date.now },
// //     status: {
// //         type: String,
// //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// //         default: "pending",
// //     },
// //     email: { type: String, unique: true, match: /.+\@.+\..+/ },
// //     fullname: { type: String, required: true },
// //     phoneNumbers: [{
// //         number: { type: String, required: true },
// //         type: { type: String, enum: ["home", "mobile", "work"], required: true },
// //         primary: { type: Boolean, default: false }
// //     }],
// //     addresses: [{
// //         street: { type: String, required: true },
// //         city: { type: String, required: true },
// //         state: { type: String, required: true },
// //         zipCode: { type: String, required: true },
// //         country: { type: String, required: true },
// //         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
// //         isDefault: { type: Boolean, default: false }
// //     }],
// //     cart: {
// //         items: [cartItemSchema]  // Include the cart items with product and invoice references
// //     },
// //     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
// //     totalPurchasedAmount: { type: Number, default: 0 },
// //     remainingAmount: { type: Number },
// //     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
// //     metadata: { type: Map, of: Schema.Types.Mixed },
// // }, { timestamps: true });


// // customerSchema.pre(/^find/, async function(next) {
// //     this.populate({
// //         path: "cart.items.productId",   
// //         select: "-__v",                  
// //     })
// //     .populate({
// //         path: "cart.items.invoiceIds",    
// //         select: "amount date",            
// //     })
// //     .populate("paymentHistory");  
// //     next();
// // });


// // customerSchema.post('save', async function (doc) {
// //     // Recalculate the total purchased amount after saving a document
// //     await calculateTotalPurchasedAmount(doc._id);
// //     await calculateRemainingAmount(doc._id);
// // });

// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     if (doc) {
// //         // Recalculate the total and remaining amounts after an update
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });

// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({
// //             path: "cart.items.invoiceIds", // Populate invoice details
// //             select: "amount",
// //         });

// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }

// //         let totalAmount = 0;
// //         if (customer.cart && customer.cart.items) {
// //             customer.cart.items.forEach(item => {
// //                 if (item.invoiceIds) {
// //                     item.invoiceIds.forEach(invoice => {
// //                         if (invoice && invoice.amount) {
// //                             totalAmount += invoice.amount;  // Add the invoice amount to the total
// //                         }
// //                     });
// //                 }
// //             });
// //         }

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("customer not found");
// //             return;
// //         }

// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => {
// //                 totalPaid += payment.amount;
// //             });
// //         }

// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("Error in calculating remaining amount", err);
// //     }
// // }


// // // const mongoose = require("mongoose");
// // // const Schema = mongoose.Schema;
// // // const Invoice = require('./invoiceModel');

// // // // Improved cart item schema
// // // const cartItemSchema = new Schema({
// // //     productId: { 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Product",
// // //         required: true,
// // //         index: true 
// // //     },
// // //     invoices: [{
// // //         type: Schema.Types.ObjectId,
// // //         ref: "Invoice",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 return await mongoose.model('Invoice').exists({ _id: v });
// // //             },
// // //             message: props => `Invoice ${props.value} does not exist`
// // //         }
// // //     }]
// // // }, { _id: false });


// // // const customerSchema = new Schema({
// // //     createdAt: { type: Date, default: Date.now },
// // //     updatedAt: { type: Date, default: Date.now },
// // //     status: {
// // //         type: String,
// // //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// // //         default: "pending",
// // //         index: true
// // //     },
// // //     email: {
// // //         type: String,
// // //         unique: true,
// // //         lowercase: true,
// // //         trim: true,
// // //         validate: {
// // //             validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
// // //             message: props => `${props.value} is not a valid email address!`
// // //         }
// // //     },
// // //     fullname: { 
// // //         type: String, 
// // //         required: true,
// // //         trim: true,
// // //         maxlength: 100 
// // //     },
// // //     phoneNumbers: [{
// // //         number: { 
// // //             type: String, 
// // //             required: true,
// // //             validate: {
// // //                 validator: function(v) {
// // //                     return /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.0-9]{9,}$/.test(v);
// // //                 },
// // //                 message: props => `${props.value} is not a valid phone number!`
// // //             }
// // //         },
// // //         type: { 
// // //             type: String, 
// // //             enum: ["home", "mobile", "work"], 
// // //             required: true 
// // //         },
// // //         primary: { type: Boolean, default: false }
// // //     }],
// // //     addresses: [{
// // //         street: { type: String, required: true },
// // //         city: { type: String, required: true },
// // //         state: { type: String, required: true },
// // //         zipCode: { 
// // //             type: String, 
// // //             required: true,
// // //             validate: {
// // //                 validator: function(v) {
// // //                     return /^\d{5,6}(?:[-\s]\d{4})?$/.test(v);
// // //                 },
// // //                 message: props => `${props.value} is not a valid zip code!`
// // //             }
// // //         },
// // //         country: { type: String, required: true },
// // //         type: { 
// // //             type: String, 
// // //             enum: ["billing", "shipping", "home", "work"], 
// // //             required: true 
// // //         },
// // //         isDefault: { type: Boolean, default: false }
// // //     }],
// // //     cart: {
// // //         items: [cartItemSchema],
// // //         validate: {
// // //             validator: function(v) {
// // //                 return v.items.length <= 100; // Prevent cart bloating
// // //             },
// // //             message: 'Cart cannot contain more than 100 items'
// // //         }
// // //     },
// // //     guaranteerId: { 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Customer",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 if (!v) return true; // Allow null/undefined
// // //                 return await mongoose.model('Customer').exists({ _id: v });
// // //             },
// // //             message: props => `Guaranteer ${props.value} does not exist`
// // //         }
// // //     },
// // //     totalPurchasedAmount: { 
// // //         type: Number, 
// // //         default: 0,
// // //         min: 0 
// // //     },
// // //     remainingAmount: { 
// // //         type: Number, 
// // //         default: 0,
// // //         min: 0 
// // //     },
// // //     paymentHistory: [{ 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Payment",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 return await mongoose.model('Payment').exists({ _id: v });
// // //             },
// // //             message: props => `Payment ${props.value} does not exist`
// // //         }
// // //     }],
// // //     metadata: { 
// // //         type: Map, 
// // //         of: Schema.Types.Mixed,
// // //         default: new Map() 
// // //     }
// // // }, { 
// // //     timestamps: true,
// // //     toJSON: { virtuals: true },
// // //     toObject: { virtuals: true }
// // // });

// // // // Indexes
// // // customerSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
// // // customerSchema.index({ 'phoneNumbers.number': 1 }, { unique: true, partialFilterExpression: { 'phoneNumbers.number': { $exists: true } } });

// // // // Virtuals
// // // customerSchema.virtual('primaryPhone').get(function() {
// // //     return this.phoneNumbers.find(ph => ph.primary)?.number;
// // // });

// // // customerSchema.virtual('defaultAddress').get(function() {
// // //     return this.addresses.find(addr => addr.isDefault);
// // // });

// // // // Optimized pre-hooks
// // // customerSchema.pre(/^find/, function(next) {
// // //     this.select('-__v -metadata');
// // //     next();
// // // });

// // // customerSchema.pre('findOne', function(next) {
// // //     this.populate({
// // //         path: 'cart.items.productId',
// // //         select: 'name price sku'
// // //     }).populate({
// // //         path: 'paymentHistory',
// // //         select: 'amount date method'
// // //     });
// // //     next();
// // // });

// // // // Optimized post hooks using bulk operations
// // // customerSchema.post(['save', 'findOneAndUpdate'], async function(doc) {
// // //     if (doc) {
// // //         await Promise.all([
// // //             calculateTotalPurchasedAmount(doc),
// // //             calculateRemainingAmount(doc)
// // //         ]);
// // //     }
// // // });

// // // customerSchema.post('findOneAndDelete', async function(doc) {
// // //     if (doc) {
// // //         // Cleanup related data
// // //         await Promise.all([
// // //             mongoose.model('Invoice').deleteMany({ customerId: doc._id }),
// // //             mongoose.model('Payment').deleteMany({ customerId: doc._id })
// // //         ]);
// // //     }
// // // });

// // // // Improved calculation functions
// // // async function calculateTotalPurchasedAmount(customer) {
// // //     try {
// // //         const result = await mongoose.model('Invoice').aggregate([
// // //             { $match: { customerId: customer._id } },
// // //             { $group: { _id: null, total: { $sum: "$amount" } } }
// // //         ]);
        
// // //         customer.totalPurchasedAmount = result[0]?.total || 0;
// // //         await customer.save({ validateBeforeSave: false });
// // //     } catch (error) {
// // //         console.error("Error calculating total purchased amount:", error);
// // //         throw error;
// // //     }
// // // }

// // // async function calculateRemainingAmount(customer) {
// // //     try {
// // //         const paymentTotal = await mongoose.model('Payment').aggregate([
// // //             { $match: { customerId: customer._id } },
// // //             { $group: { _id: null, total: { $sum: "$amount" } } }
// // //         ]);
        
// // //         customer.remainingAmount = customer.totalPurchasedAmount - (paymentTotal[0]?.total || 0);
// // //         await customer.save({ validateBeforeSave: false });
// // //     } catch (error) {
// // //         console.error("Error calculating remaining amount:", error);
// // //         throw error;
// // //     }
// // // }

// // // module.exports = mongoose.model("Customer", customerSchema);





// // // ======================================================
// // const mongoose = require("mongoose");
// // const Schema = mongoose.Schema;
// // const Invoice=require('./invoiceModel')

// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  // Link to the Product schema
// //         required: true 
// //     },
// //     invoiceIds: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Invoice"  // Link to the Invoice schema
// //     }],
// // });
// // const customerSchema = new Schema({
// //     // customerId: { type: mongoose.Schema.Types.ObjectId },
// //     createdAt: { type: Date, required: true, default: Date.now },
// //     updatedAt: { type: Date, required: true, default: Date.now },
// //     status: {type: String, enum: ["active", "inactive", "pending", "suspended", "blocked"], default: "pending",},
// //     email: { type: String, unique: true, match: /.+\@.+\..+/ },
// //     fullname: { type: String, required: true },
// //     phoneNumbers: [{ number: { type: String, required: true }, type: { type: String, enum: ["home", "mobile", "work"], required: true }, primary: { type: Boolean, default: false } },],
// //     addresses: [{ street: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true }, zipCode: { type: String, required: true }, country: { type: String, required: true }, type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true }, isDefault: { type: Boolean, default: false } },],
// //     cart: { items: [cartItemSchema] },
// //     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",required:false },
// //     totalPurchasedAmount: { type: Number, default: 0 },
// //     remainingAmount: { type: Number },
// //     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
// //     metadata: { type: Map, of: Schema.Types.Mixed },
// // }, { timestamps: true });


// // customerSchema.pre(/^find/, async function (next) {
// //     this.populate({ path: "cart.items.productId", select: "-__v" });
// //     this.populate({ path: "cart.items.invoiceIds", select: "amount" });
// //     this.populate("paymentHistory");
// //     next();
// // });
// // customerSchema.post('save', async function (doc) {
// //     await calculateTotalPurchasedAmount(doc._id);
// //     await calculateRemainingAmount(doc._id);
// // });
// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     if (doc) {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });
// // customerSchema.post('findOneAndDelete', async function (doc) {
// //     if (doc) {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });

// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({ 
// //             path: "cart.items.invoiceIds",
// //             select: "amount",
// //         });
// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }
// //         let totalAmount = 0;
// //         if (customer.cart && customer.cart.items) {
// //             customer.cart.items.forEach(item => {
// //                 if (item.invoiceIds) {
// //                     item.invoiceIds.forEach(invoice => {
// //                         if (invoice && invoice.amount) {
// //                             totalAmount += invoice.amount;
// //                         }
// //                     });
// //                 }
// //             });
// //         }

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("customer not found");
// //             return;
// //         }
// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => {
// //                 totalPaid += payment.amount;
// //             });
// //         }
// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("error in calculating remaining amount", err);
// //     }
// // }
// // module.exports= mongoose.model("Customer", customerSchema);
//  */

// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  
// //         required: true 
// //     },
// //     invoiceIds: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Invoice"  
// //     }],
// // });

// // const customerSchema = new Schema({
// //     createdAt: { type: Date, required: true, default: Date.now },
// //     updatedAt: { type: Date, required: true, default: Date.now },
// //     status: {
// //         type: String,
// //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// //         default: "pending",
// //     },
// //     email: { type: String, unique: true, match: /.+\@.+\..+/ },
// //     fullname: { type: String, required: true },
// //     phoneNumbers: [{
// //         number: { type: String, required: true },
// //         type: { type: String, enum: ["home", "mobile", "work"], required: true },
// //         primary: { type: Boolean, default: false }
// //     }],
// //     addresses: [{
// //         street: { type: String, required: true },
// //         city: { type: String, required: true },
// //         state: { type: String, required: true },
// //         zipCode: { type: String, required: true },
// //         country: { type: String, required: true },
// //         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
// //         isDefault: { type: Boolean, default: false }
// //     }],
// //     cart: {
// //         items: [cartItemSchema]  // Include the cart items with product and invoice references
// //     },
// //     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
// //     totalPurchasedAmount: { type: Number, default: 0 },
// //     remainingAmount: { type: Number },
// //     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
// //     metadata: { type: Map, of: Schema.Types.Mixed },
// // }, { timestamps: true });


// // customerSchema.pre(/^find/, async function(next) {
// //     this.populate({
// //         path: "cart.items.productId",   
// //         select: "-__v",                  
// //     })
// //     .populate({
// //         path: "cart.items.invoiceIds",    
// //         select: "amount date",            
// //     })
// //     .populate("paymentHistory");  
// //     next();
// // });


// // customerSchema.post('save', async function (doc) {
// //     // Recalculate the total purchased amount after saving a document
// //     await calculateTotalPurchasedAmount(doc._id);
// //     await calculateRemainingAmount(doc._id);
// // });

// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     if (doc) {
// //         // Recalculate the total and remaining amounts after an update
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });

// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({
// //             path: "cart.items.invoiceIds", // Populate invoice details
// //             select: "amount",
// //         });

// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }

// //         let totalAmount = 0;
// //         if (customer.cart && customer.cart.items) {
// //             customer.cart.items.forEach(item => {
// //                 if (item.invoiceIds) {
// //                     item.invoiceIds.forEach(invoice => {
// //                         if (invoice && invoice.amount) {
// //                             totalAmount += invoice.amount;  // Add the invoice amount to the total
// //                         }
// //                     });
// //                 }
// //             });
// //         }

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("customer not found");
// //             return;
// //         }

// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => {
// //                 totalPaid += payment.amount;
// //             });
// //         }

// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("Error in calculating remaining amount", err);
// //     }
// // }


// // // const mongoose = require("mongoose");
// // // const Schema = mongoose.Schema;
// // // const Invoice = require('./invoiceModel');

// // // // Improved cart item schema
// // // const cartItemSchema = new Schema({
// // //     productId: { 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Product",
// // //         required: true,
// // //         index: true 
// // //     },
// // //     invoices: [{
// // //         type: Schema.Types.ObjectId,
// // //         ref: "Invoice",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 return await mongoose.model('Invoice').exists({ _id: v });
// // //             },
// // //             message: props => `Invoice ${props.value} does not exist`
// // //         }
// // //     }]
// // // }, { _id: false });


// // // const customerSchema = new Schema({
// // //     createdAt: { type: Date, default: Date.now },
// // //     updatedAt: { type: Date, default: Date.now },
// // //     status: {
// // //         type: String,
// // //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// // //         default: "pending",
// // //         index: true
// // //     },
// // //     email: {
// // //         type: String,
// // //         unique: true,
// // //         lowercase: true,
// // //         trim: true,
// // //         validate: {
// // //             validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
// // //             message: props => `${props.value} is not a valid email address!`
// // //         }
// // //     },
// // //     fullname: { 
// // //         type: String, 
// // //         required: true,
// // //         trim: true,
// // //         maxlength: 100 
// // //     },
// // //     phoneNumbers: [{
// // //         number: { 
// // //             type: String, 
// // //             required: true,
// // //             validate: {
// // //                 validator: function(v) {
// // //                     return /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.0-9]{9,}$/.test(v);
// // //                 },
// // //                 message: props => `${props.value} is not a valid phone number!`
// // //             }
// // //         },
// // //         type: { 
// // //             type: String, 
// // //             enum: ["home", "mobile", "work"], 
// // //             required: true 
// // //         },
// // //         primary: { type: Boolean, default: false }
// // //     }],
// // //     addresses: [{
// // //         street: { type: String, required: true },
// // //         city: { type: String, required: true },
// // //         state: { type: String, required: true },
// // //         zipCode: { 
// // //             type: String, 
// // //             required: true,
// // //             validate: {
// // //                 validator: function(v) {
// // //                     return /^\d{5,6}(?:[-\s]\d{4})?$/.test(v);
// // //                 },
// // //                 message: props => `${props.value} is not a valid zip code!`
// // //             }
// // //         },
// // //         country: { type: String, required: true },
// // //         type: { 
// // //             type: String, 
// // //             enum: ["billing", "shipping", "home", "work"], 
// // //             required: true 
// // //         },
// // //         isDefault: { type: Boolean, default: false }
// // //     }],
// // //     cart: {
// // //         items: [cartItemSchema],
// // //         validate: {
// // //             validator: function(v) {
// // //                 return v.items.length <= 100; // Prevent cart bloating
// // //             },
// // //             message: 'Cart cannot contain more than 100 items'
// // //         }
// // //     },
// // //     guaranteerId: { 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Customer",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 if (!v) return true; // Allow null/undefined
// // //                 return await mongoose.model('Customer').exists({ _id: v });
// // //             },
// // //             message: props => `Guaranteer ${props.value} does not exist`
// // //         }
// // //     },
// // //     totalPurchasedAmount: { 
// // //         type: Number, 
// // //         default: 0,
// // //         min: 0 
// // //     },
// // //     remainingAmount: { 
// // //         type: Number, 
// // //         default: 0,
// // //         min: 0 
// // //     },
// // //     paymentHistory: [{ 
// // //         type: Schema.Types.ObjectId, 
// // //         ref: "Payment",
// // //         validate: {
// // //             validator: async function(v) {
// // //                 return await mongoose.model('Payment').exists({ _id: v });
// // //             },
// // //             message: props => `Payment ${props.value} does not exist`
// // //         }
// // //     }],
// // //     metadata: { 
// // //         type: Map, 
// // //         of: Schema.Types.Mixed,
// // //         default: new Map() 
// // //     }
// // // }, { 
// // //     timestamps: true,
// // //     toJSON: { virtuals: true },
// // //     toObject: { virtuals: true }
// // // });

// // // // Indexes
// // // customerSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
// // // customerSchema.index({ 'phoneNumbers.number': 1 }, { unique: true, partialFilterExpression: { 'phoneNumbers.number': { $exists: true } } });

// // // // Virtuals
// // // customerSchema.virtual('primaryPhone').get(function() {
// // //     return this.phoneNumbers.find(ph => ph.primary)?.number;
// // // });

// // // customerSchema.virtual('defaultAddress').get(function() {
// // //     return this.addresses.find(addr => addr.isDefault);
// // // });

// // // // Optimized pre-hooks
// // // customerSchema.pre(/^find/, function(next) {
// // //     this.select('-__v -metadata');
// // //     next();
// // // });

// // // customerSchema.pre('findOne', function(next) {
// // //     this.populate({
// // //         path: 'cart.items.productId',
// // //         select: 'name price sku'
// // //     }).populate({
// // //         path: 'paymentHistory',
// // //         select: 'amount date method'
// // //     });
// // //     next();
// // // });

// // // // Optimized post hooks using bulk operations
// // // customerSchema.post(['save', 'findOneAndUpdate'], async function(doc) {
// // //     if (doc) {
// // //         await Promise.all([
// // //             calculateTotalPurchasedAmount(doc),
// // //             calculateRemainingAmount(doc)
// // //         ]);
// // //     }
// // // });

// // // customerSchema.post('findOneAndDelete', async function(doc) {
// // //     if (doc) {
// // //         // Cleanup related data
// // //         await Promise.all([
// // //             mongoose.model('Invoice').deleteMany({ customerId: doc._id }),
// // //             mongoose.model('Payment').deleteMany({ customerId: doc._id })
// // //         ]);
// // //     }
// // // });

// // // // Improved calculation functions
// // // async function calculateTotalPurchasedAmount(customer) {
// // //     try {
// // //         const result = await mongoose.model('Invoice').aggregate([
// // //             { $match: { customerId: customer._id } },
// // //             { $group: { _id: null, total: { $sum: "$amount" } } }
// // //         ]);
        
// // //         customer.totalPurchasedAmount = result[0]?.total || 0;
// // //         await customer.save({ validateBeforeSave: false });
// // //     } catch (error) {
// // //         console.error("Error calculating total purchased amount:", error);
// // //         throw error;
// // //     }
// // // }

// // // async function calculateRemainingAmount(customer) {
// // //     try {
// // //         const paymentTotal = await mongoose.model('Payment').aggregate([
// // //             { $match: { customerId: customer._id } },
// // //             { $group: { _id: null, total: { $sum: "$amount" } } }
// // //         ]);
        
// // //         customer.remainingAmount = customer.totalPurchasedAmount - (paymentTotal[0]?.total || 0);
// // //         await customer.save({ validateBeforeSave: false });
// // //     } catch (error) {
// // //         console.error("Error calculating remaining amount:", error);
// // //         throw error;
// // //     }
// // // }

// // // module.exports = mongoose.model("Customer", customerSchema);


// // // ======================================================
// // const mongoose = require("mongoose");
// // const Schema = mongoose.Schema;
// // const Invoice=require('./invoiceModel')

// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Product",  // Link to the Product schema
// //         required: true 
// //     },
// //     invoiceIds: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: "Invoice"  // Link to the Invoice schema
// //     }],
// // });
// // const customerSchema = new Schema({
// //     // customerId: { type: mongoose.Schema.Types.ObjectId },
// //     createdAt: { type: Date, required: true, default: Date.now },
// //     updatedAt: { type: Date, required: true, default: Date.now },
// //     status: {type: String, enum: ["active", "inactive", "pending", "suspended", "blocked"], default: "pending",},
// //     email: { type: String, unique: true, match: /.+\@.+\..+/ },
// //     fullname: { type: String, required: true },
// //     phoneNumbers: [{ number: { type: String, required: true }, type: { type: String, enum: ["home", "mobile", "work"], required: true }, primary: { type: Boolean, default: false } },],
// //     addresses: [{ street: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true }, zipCode: { type: String, required: true }, country: { type: String, required: true }, type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true }, isDefault: { type: Boolean, default: false } },],
// //     cart: { items: [cartItemSchema] },
// //     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",required:false },
// //     totalPurchasedAmount: { type: Number, default: 0 },
// //     remainingAmount: { type: Number },
// //     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
// //     metadata: { type: Map, of: Schema.Types.Mixed },
// // }, { timestamps: true });


// // customerSchema.pre(/^find/, async function (next) {
// //     this.populate({ path: "cart.items.productId", select: "-__v" });
// //     this.populate({ path: "cart.items.invoiceIds", select: "amount" });
// //     this.populate("paymentHistory");
// //     next();
// // });
// // customerSchema.post('save', async function (doc) {
// //     await calculateTotalPurchasedAmount(doc._id);
// //     await calculateRemainingAmount(doc._id);
// // });
// // customerSchema.post('findOneAndUpdate', async function (doc) {
// //     if (doc) {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });
// // customerSchema.post('findOneAndDelete', async function (doc) {
// //     if (doc) {
// //         await calculateTotalPurchasedAmount(doc._id);
// //         await calculateRemainingAmount(doc._id);
// //     }
// // });

// // async function calculateTotalPurchasedAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate({ 
// //             path: "cart.items.invoiceIds",
// //             select: "amount",
// //         });
// //         if (!customer) {
// //             console.error("Customer not found");
// //             return;
// //         }
// //         let totalAmount = 0;
// //         if (customer.cart && customer.cart.items) {
// //             customer.cart.items.forEach(item => {
// //                 if (item.invoiceIds) {
// //                     item.invoiceIds.forEach(invoice => {
// //                         if (invoice && invoice.amount) {
// //                             totalAmount += invoice.amount;
// //                         }
// //                     });
// //                 }
// //             });
// //         }

// //         customer.totalPurchasedAmount = totalAmount;
// //         await customer.save();
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //     }
// // }

// // async function calculateRemainingAmount(customerId) {
// //     try {
// //         const customer = await Customer.findById(customerId).populate('paymentHistory');
// //         if (!customer) {
// //             console.log("customer not found");
// //             return;
// //         }
// //         let totalPaid = 0;
// //         if (customer.paymentHistory) {
// //             customer.paymentHistory.forEach(payment => {
// //                 totalPaid += payment.amount;
// //             });
// //         }
// //         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
// //         await customer.save();
// //     } catch (err) {
// //         console.log("error in calculating remaining amount", err);
// //     }
// // }
// // module.exports= mongoose.model("Customer", customerSchema);
