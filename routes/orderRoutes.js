const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Import mongoose for transactions
const authController = require('../Controllers/authController');
const factory = require('../Controllers/handleFactory'); // Import the factory

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

// All subsequent routes are protected
router.use(authController.protect);

// --- MAIN CHECKOUT LOGIC ---
router.post('/checkout', [
    // Validation middleware remains the same, it's already well-implemented
    body('products').isArray({ min: 1 }).withMessage('Products must be a non-empty array'),
    body('products.*.product').isMongoId().withMessage('A valid Product ID is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('token').notEmpty().withMessage('Payment token is required'),
], catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(', ');
        return next(new AppError(errorMsg, 400));
    }

    const { products, shippingAddress, token } = req.body;
    const userId = req.user._id;

    // 1. Fetch all product data in a SINGLE query to avoid N+1 problem
    const productIds = products.map(p => p.product);
    const foundProducts = await Product.find({ '_id': { $in: productIds } });

    // Create a map for easy lookups
    const productMap = new Map(foundProducts.map(p => [p._id.toString(), p]));

    // 2. Validate products and calculate total price
    let totalPrice = 0;
    const orderItems = [];
    for (const item of products) {
        const product = productMap.get(item.product);
        if (!product) {
            return next(new AppError(`Product with ID ${item.product} not found`, 404));
        }
        if (product.stock < item.quantity) {
             return next(new AppError(`Not enough stock for ${product.name}`, 400));
        }
        totalPrice += product.finalPrice * item.quantity;
        orderItems.push({ product: product._id, name: product.name, price: product.finalPrice, quantity: item.quantity });
    }

    // Find customer
    const customer = await Customer.findOne({ email: req.user.email });
    if (!customer) return next(new AppError('Customer profile not found for this user', 404));

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Process Stripe payment
        const charge = await stripe.charges.create({
            amount: Math.round(totalPrice * 100), // Use Math.round to avoid float issues
            currency: 'usd',
            source: token.id,
            description: `Order by ${req.user.email}`,
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
            payment: payment[0]._id,
            isPaid: true,
            status: 'Processing',
        }], { session });
        
        // 3. EFFICIENTLY Create invoice items from pre-fetched data
        const invoiceItems = orderItems.map(item => {
            const product = productMap.get(item.product.toString());
            const taxableValue = product.rate * item.quantity;
            const gstAmount = (taxableValue * product.gstRate) / 100;
            return {
                product: item.product,
                quantity: item.quantity,
                rate: product.rate,
                taxableValue,
                gstRate: product.gstRate,
                gstAmount,
                amount: taxableValue + gstAmount,
            };
        });

        const invoice = await Invoice.create([{
            invoiceNumber: `INV-${Date.now()}`,
            order: order[0]._id, // Link to the order
            seller: 'your-seller-id', // Replace with actual seller logic
            buyer: customer._id,
            items: invoiceItems,
            subTotal: totalPrice, // This should be sum of taxableValue
            totalAmount: totalPrice, // Adjust for final amount including taxes
        }], { session });

        // Link invoice to order and update stock
        order[0].invoice = invoice[0]._id;
        await order[0].save({ session });
        
        // 4. Update product stock
        for (const item of orderItems) {
            await Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } }, { session });
        }

        await session.commitTransaction();
        res.status(201).json({
            status: 'success',
            message: 'Order processed successfully',
            data: { order: order[0] },
        });

    } catch (error) {
        await session.abortTransaction();
        return next(new AppError(`Checkout failed: ${error.message}`, 500));
    } finally {
        session.endSession();
    }
}));


// --- USER-SPECIFIC ROUTE ---
// Kept as a custom function due to its specific authorization logic
router.get('/:id', catchAsync(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('products.product', 'name');
    if (!order) return next(new AppError('Order not found', 404));

    // Allow access if user is admin/staff OR if the order belongs to the user
    if (!['admin', 'staff'].includes(req.user.role) && req.user._id.toString() !== order.user.toString()) {
        return next(new AppError('You do not have permission to view this order', 403));
    }

    res.status(200).json({
        status: 'success',
        data: order,
    });
}));


// --- ADMIN & STAFF ONLY ROUTES ---
router.use(authController.restrictTo('admin', 'staff'));

// Use factory to get all, update, and delete orders
router.get('/', factory.getAll(Order));
router.patch('/:id', factory.update(Order));
router.delete('/:id', factory.delete(Order));

module.exports = router;
