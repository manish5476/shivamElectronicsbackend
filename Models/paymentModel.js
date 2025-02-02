const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  userCode: {
    type: String,
    required: [true, 'User code is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY'],
    uppercase: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer']
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'refunded']
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness for non-null values
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true // Auto-manage createdAt and updatedAt
});

paymentSchema.index({ userCode: 1, createdAt: -1 });
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

paymentSchema.methods.isSuccessful = function() {
  return this.status === 'completed';
};

paymentSchema.statics.findByUserCode = function(userCode) {
  return this.find({ userCode }).sort({ createdAt: -1 });
};

paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;