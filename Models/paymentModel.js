const mongoose = require('mongoose');
const { Schema } = mongoose;
const Customer = require('./customerModel');

const paymentSchema = new Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'upi', 'crypto', 'bank_transfer'],
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'refunded'],
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: { type: String },
  phoneNumbers: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  description: { type: String, maxlength: 200 },
}, { timestamps: true });

// Generate transaction ID
paymentSchema.pre('save', function (next) {
  if (!this.transactionId) {
    this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Update customer payment history with transaction
paymentSchema.post('save', async function (doc) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const customer = await Customer.findById(doc.customerId).session(session);
    if (!customer) {
      throw new Error('Customer not found');
    }
    customer.paymentHistory.push(doc._id);
    await customer.save({ session });
    await require('./customerModel').updateCustomerTotals(doc.customerId, session);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw new mongoose.Error(`Failed to update customer payment history: ${error.message}`);
  } finally {
    session.endSession();
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;

// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;
// const Customer = require('./customerModel'); // Assuming there's a customer model

// const paymentSchema = new Schema({
 
//   amount: {
//     type: Number,
//     required: [true, 'Amount is required'],
//     min: [0, 'Amount cannot be negative']
//   },
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['credit_card', 'debit_card', 'upi', 'crypto', 'bank_transfer']
//   },
//   status: {
//     type: String,
//     default: 'pending',
//     enum: ['pending', 'completed', 'failed', 'refunded']
//   },
//   transactionId: {
//     type: String,
//     unique: true,
//     sparse: true // Only one payment should have this transaction ID
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   },
//   customerId: { // Reference to the Customer schema
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true
//   },
//   customerName:{
//     type :String
//   },
//   phoneNumbers:{
//     type:String
//   },
//   metadata: {
//     type: Schema.Types.Mixed,
//     default: {}
//   },
//   description: {
//     type: String,
//     maxlength: 200
//   }
// }, {
//   timestamps: true // Automatically manage createdAt and updatedAt
// });

// // Pre-save Hook to generate the transaction ID if not provided
// paymentSchema.pre('save', function(next) {
//   if (!this.transactionId) {
//     this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//   }
//   next();
// });

// // Post-save Hook to push payment data to the customer's paymentHistory array
// paymentSchema.post('save', async function(doc) {
//   try {
//     const customer = await Customer.findById(doc.customerId);
    
//     if (!customer) {
//       console.log("Customer not found");
//       return;
//     }

//     // Add the payment to the customer's paymentHistory
//     customer.paymentHistory.push(doc._id);
    
//     // Recalculate the remaining amount after adding the new payment
//     await calculateRemainingAmount(doc.customerId);

//     // Save the customer with the updated paymentHistory
//     await customer.save();
//   } catch (error) {
//     console.error("Error in post-save hook:", error);
//   }
// });

// // Helper function to recalculate remaining amount
// async function calculateRemainingAmount(customerId) {
//   try {
//     const customer = await Customer.findById(customerId).populate('paymentHistory');
    
//     if (!customer) {
//       console.log("Customer not found");
//       return;
//     }

//     let totalPaid = 0;
//     if (customer.paymentHistory) {
//       customer.paymentHistory.forEach(paymentId => {
//         const payment = customer.paymentHistory.find(payment => payment._id.toString() === paymentId.toString());
//         if (payment && payment.status === 'completed') {
//           totalPaid += payment.amount;
//         }
//       });
//     }

//     customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//     await customer.save();
//   } catch (err) {
//     console.log("Error calculating remaining amount:", err);
//   }
// }

// const Payment = mongoose.model('Payment', paymentSchema);
// module.exports = Payment;

// // const mongoose = require('mongoose');
// // const Schema = mongoose.Schema;

// // const paymentSchema = new Schema({
// //   userCode: {
// //     type: String,
// //     required: [true, 'User code is required'],
// //     index: true
// //   },
// //   amount: {
// //     type: Number,
// //     required: [true, 'Amount is required'],
// //     min: [0, 'Amount cannot be negative']
// //   },
// //   paymentMethod: {
// //     type: String,
// //     required: true,
// //     enum: ['credit_card', 'debit_card', 'upi', 'crypto', 'bank_transfer']
// //   },
// //   status: {
// //     type: String,
// //     default: 'pending',
// //     enum: ['pending', 'completed', 'failed', 'refunded']
// //   },
// //   transactionId: {
// //     type: String,
// //     unique: true,
// //     sparse: true 
// //   },
// //   createdAt: {
// //     type: Date,
// //     default: Date.now
// //   },
// //   updatedAt: {
// //     type: Date,
// //     default: Date.now
// //   },
// //   metadata: {
// //     type: Schema.Types.Mixed,
// //     default: {}
// //   },
// //   description: {
// //     type: String,
// //     maxlength: 200
// //   }
// // }, {
// //   timestamps: true // Auto-manage createdAt and updatedAt
// // });

// // paymentSchema.index({ userCode: 1, createdAt: -1 });
// // paymentSchema.virtual('formattedAmount').get(function() {
// //   return `${this.currency} ${this.amount.toFixed(2)}`;
// // });

// // paymentSchema.methods.isSuccessful = function() {
// //   return this.status === 'completed';
// // };

// // paymentSchema.statics.findByUserCode = function(userCode) {
// //   return this.find({ userCode }).sort({ createdAt: -1 });
// // };

// // paymentSchema.pre('save', function(next) {
// //   if (!this.transactionId) {
// //     this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
// //   }
// //   next();
// // });

// // const Payment = mongoose.model('Payment', paymentSchema);

// // module.exports = Payment;