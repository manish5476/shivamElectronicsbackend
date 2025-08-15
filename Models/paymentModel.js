// In: C:\Shivam Electronics Project\shivamElectronicsbackend\Models\paymentModel.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Customer = require('./customerModel'); // Assuming there's a customer model
const User =require('./UserModel')

const paymentSchema = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assumes you have a 'User' model
        required: true // Every payment must belong to a user
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['credit_card', 'debit_card', 'upi', 'crypto', 'bank_transfer']
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'completed', 'failed', 'refunded']
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true // Only one payment should have this transaction ID
    },
    // --- ADD THIS 'date' FIELD ---
    date: {
        type: Date,
        required: [true, 'Payment date is required'], // Make it required to ensure it's always present
        default: Date.now // Set a default if not provided
    },
    // --- END ADDITION ---
    createdAt: { // This is automatically managed by timestamps: true, but explicitly defined here
        type: Date,
        default: Date.now
    },
    updatedAt: { // This is automatically managed by timestamps: true, but explicitly defined here
        type: Date,
        default: Date.now
    },
    customerId: { // Reference to the Customer schema
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: { // This field is often redundant if you populate customerId, but kept for direct storage if needed
        type: String
    },
    phoneNumbers: { // This field seems out of place on a Payment model, usually on Customer
        type: String
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    description: {
        type: String,
        maxlength: 200
    },
    reviews: {
        type: String,
        maxlength: 200
    }
}, {
    timestamps: true // Automatically manage createdAt and updatedAt
});

paymentSchema.pre('save', function (next) {
    if (!this.transactionId) {
        this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    // Ensure 'date' is set if it's new and not explicitly provided, though 'default' handles this
    if (!this.date) {
        this.date = new Date();
    }
    next();
});

// Post-save Hook to push payment data to the customer's paymentHistory array
paymentSchema.post('save', async function (doc) {
    try {
        const customer = await Customer.findById(doc.customerId);

        if (!customer) {
            console.log("Customer not found for payment post-save hook.");
            return;
        }
        // Ensure paymentHistory is an array before pushing
        if (!customer.paymentHistory) {
            customer.paymentHistory = [];
        }
        customer.paymentHistory.push(doc._id);
        await calculateRemainingAmount(doc.customerId);
        await customer.save();
    } catch (error) {
        console.error("Error in payment post-save hook:", error);
    }
});

// Assuming this function is defined elsewhere or within the same file and accessible
// It's better to define it before it's used or export it if it's in another file
async function calculateRemainingAmount(customerId) {
    try {
        // Populate paymentHistory to get full payment documents, not just IDs
        const customer = await Customer.findById(customerId).populate('paymentHistory');
        if (!customer) {
            console.log("Customer not found for remaining amount calculation.");
            return;
        }

        let totalPaid = 0;
        // Ensure paymentHistory is an array and iterate over it
        if (customer.paymentHistory && Array.isArray(customer.paymentHistory)) {
            customer.paymentHistory.forEach(payment => {
                // Check if payment.amount exists before adding
                if (typeof payment.amount === 'number') {
                    totalPaid += payment.amount;
                }
            });
        }

        // Ensure totalPurchasedAmount is a number
        const totalPurchased = typeof customer.totalPurchasedAmount === 'number' ? customer.totalPurchasedAmount : 0;
        customer.remainingAmount = totalPurchased - totalPaid;
        await customer.save();
    } catch (err) {
        console.error("Error calculating remaining amount:", err);
    }
}


const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;