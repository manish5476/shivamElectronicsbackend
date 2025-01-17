const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ['card', 'cash', 'upi', 'netBanking'],
        default: 'cash'
    },
    transactionId: {
        type: String
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    }
}, { timestamps: true });
const Payment = mongoose.model("Payment", paymentSchema);