const cartItemSchema = new Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
});