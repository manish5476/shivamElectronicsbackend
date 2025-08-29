const mongoose = require("mongoose");
const { Schema } = mongoose;

const installmentSchema = new Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "paid", "overdue"],
        default: "pending",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" }, // Link to the actual payment record
});

const emiSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        customer: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        invoice: {
            type: Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
            unique: true,
        },
        totalAmount: { type: Number, required: true },
        numberOfInstallments: { type: Number, required: true },
        startDate: { type: Date, required: true },
        installments: [installmentSchema],
        status: {
            type: String,
            enum: ["active", "completed", "defaulted"],
            default: "active",
        },
    },
    { timestamps: true },
);

// Add an index for efficient querying of upcoming and overdue EMIs
emiSchema.index({ "installments.dueDate": 1, "installments.status": 1 });

const Emi = mongoose.model("Emi", emiSchema);
module.exports = Emi;
