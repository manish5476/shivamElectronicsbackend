const mongoose = require('mongoose');
const { Schema } = mongoose;
const Product = require('./productModel');
const Payment = require('./paymentModel');
const Invoice = require('./invoiceModel');
const Customer = require('./customerModel');

const orderItemSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
});

const orderSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  products: [orderItemSchema],
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  shippingAddress: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'credit_card', 'upi', 'bank_transfer']
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

// Indexes for performance
orderSchema.index({ user: 1 });
orderSchema.index({ customer: 1 });

// Populate references
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  })
    .populate({
      path: 'customer',
      select: 'fullname email',
    })
    .populate({
      path: 'products.product',
      select: 'title finalPrice thumbnail',
    })
    .populate({
      path: 'payment',
      select: 'amount status transactionId',
    })
    .populate({
      path: 'invoice',
      select: 'invoiceNumber totalAmount status',
    });
  next();
});

orderSchema.pre('findOne', function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  })
    .populate({
      path: 'customer',
      select: 'fullname email',
    })
    .populate({
      path: 'products.product',
      select: 'title finalPrice thumbnail',
    })
    .populate({
      path: 'payment',
      select: 'amount status transactionId',
    })
    .populate({
      path: 'invoice',
      select: 'invoiceNumber totalAmount status',
    });
  next();
});

// Pre-save: Update product stock
orderSchema.pre('save', async function (next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of this.products) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product ${item.product} not found`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.title}`);
      product.stock -= item.quantity;
      await product.save({ session });
    }
    await session.commitTransaction();
    next();
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;