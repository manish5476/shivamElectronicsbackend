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
