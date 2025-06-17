const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const Order = require('../Models/orderModel');
const Product = require('../Models/productModel');
const Payment = require('../Models/paymentModel');
const Invoice = require('../Models/invoiceModel');
const Customer = require('../Models/customerModel');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.post('/checkout', [
  body('products').isArray().withMessage('Products must be an array'),
  body('products.*.product').notEmpty().withMessage('Product ID is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('token').notEmpty().withMessage('Payment token is required'),
], catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
  }

  const { products, shippingAddress, token } = req.body;
  const userId = req.user._id;

  // Find or link customer to user (assuming a user-customer mapping exists)
  const customer = await Customer.findOne({ email: req.user.email });
  if (!customer) return next(new AppError('Customer profile not found for this user', 404));

  // Calculate total price
  let totalPrice = 0;
  const orderItems = [];
  for (const item of products) {
    const product = await Product.findById(item.product);
    if (!product) return next(new AppError(`Product ${item.product} not found`, 404));
    totalPrice += product.finalPrice * item.quantity;
    orderItems.push({ product: item.product, quantity: item.quantity });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Process Stripe payment
    const charge = await stripe.charges.create({
      amount: totalPrice * 100, // Convert to cents
      currency: 'usd',
      source: token.id,
      description: `Order for ${products.length} products by ${req.user.email}`,
    });

    // Create Payment document
    const payment = await Payment.create([{
      amount: totalPrice,
      paymentMethod: 'stripe',
      status: 'completed',
      transactionId: charge.id,
      customerId: customer._id,
      customerName: customer.fullname,
    }], { session });

    // Create Order document
    const order = await Order.create([{
      user: userId,
      customer: customer._id,
      products: orderItems,
      totalPrice,
      shippingAddress,
      paymentMethod: 'stripe',
      payment: payment[0]._id,
      isPaid: true,
    }], { session });

    // Create Invoice document
    // const invoiceItems = orderItems.map(async item => ({
    //   product: item.product,
    //   quantity: item.quantity,
    //   rate: (await Product.findById(item.product)).rate,
    //   taxableValue: (await Product.findById(item.product)).rate * item.quantity,
    //   gstRate: (await Product.findById(item.product)).gstRate,
    //   gstAmount: ((await Product.findById(item.product)).rate * item.quantity * (await Product.findById(item.product)).gstRate) / 100,
    //   amount: ((await Product.findById(item.product)).rate * item.quantity) + (((await Product.findById(item.product)).rate * item.quantity * (await Product.findById(item.product)).gstRate) / 100),
    // }));

    const invoice = await Invoice.create([{
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date(),
      seller: 'your-seller-id', // Replace with actual seller logic
      buyer: customer._id,
      items: invoiceItems,
      subTotal: totalPrice,
      totalAmount: totalPrice, // Adjust if GST is separate
    }], { session });

    // Link invoice to order
    order[0].invoice = invoice[0]._id;
    await order[0].save({ session });
// m
    await session.commitTransaction();
    res.json({
      status: 'success',
      message: 'Order processed successfully',
      data: { order: order[0], payment: payment[0], invoice: invoice[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(`Checkout failed: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
}));

router.get('/:id', catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));

  // Restrict to own order or admin
  if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user._id.toString() !== order.user.toString()) {
    return next(new AppError('You can only view your own orders', 403));
  }

  res.status(200).json({
    status: 'success',
    data: order,
  });
}));

// Admin/staff-only routes
router.get('/', authController.restrictTo('admin', 'staff'), catchAsync(async (req, res, next) => {
  const orders = await Order.find();
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: orders,
  });
}));

router.patch('/:id', authController.restrictTo('admin', 'staff'), catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!order) return next(new AppError('Order not found', 404));
  res.status(201).json({
    status: 'success',
    data: order,
  });
}));

router.delete('/:id', authController.restrictTo('admin', 'staff'), catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({
    status: 'success',
    message: 'Order deleted successfully',
    data: null,
  });
}));

module.exports = router;