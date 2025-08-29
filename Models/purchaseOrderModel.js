const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, required: true, min: 0 }, // The price you buy it for
});

const purchaseOrderSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
        items: [purchaseOrderItemSchema],
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["pending", "completed", "cancelled"],
            default: "pending",
        },
        orderDate: { type: Date, default: Date.now },
        receivedDate: { type: Date }, // Date when the stock is received
    },
    { timestamps: true },
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
module.exports = PurchaseOrder;
