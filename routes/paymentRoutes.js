const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const paymentController = require('../Controllers/paymentController');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.post('/', paymentController.newPayment); // Users can create payments
router.get('/:id', paymentController.getPaymentById); // Users can view their payment

// Admin/staff-only routes
router.get('/', authController.restrictTo('admin', 'staff'), paymentController.getAllPayment); // View all payments
router.patch('/:id', authController.restrictTo('admin', 'staff'), paymentController.updatePayment); // Update payment
router.delete('/:id', authController.restrictTo('admin', 'staff'), paymentController.deletePayment); // Delete payment

module.exports = router;