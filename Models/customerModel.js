const customerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/, // Indian mobile number validation
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  location: {
    type: {
      type: String,
      enum: ["Point"], // Only 'Point' type is supported for GeoJSON
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  purchaseHistory: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
      quantity: { type: Number, required: true },
      purchaseDate: { type: Date, default: Date.now },
      invoice: {
        type: mongoose.Schema.ObjectId,
        ref: "Invoice",
      },
    },
  ],
  emiDetails: {
    guarantor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    totalPrice: { type: Number, required: true },
    paidPrice: { type: Number, default: 0 },
    remainingPrice: { type: Number, required: true },
    paymentHistory: [
      {
        paymentDate: { type: Date, default: Date.now },
        amountPaid: { type: Number, required: true },
      },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial index for querying location
customerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Customer", customerSchema);
