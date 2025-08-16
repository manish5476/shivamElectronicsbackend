const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const paymentController = require('../Controllers/paymentController');

// Import the factory and the Payment model
const factory = require('../Controllers/handleFactory');
const Payment = require('../Models/paymentModel'); // Make sure this path is correct

// --- All routes are protected from this point ---
router.use(authController.protect);

// --- User-accessible routes ---

// POST to / -> Creates one or many payments (for manual entries)
router.post('/', factory.create(Payment));

// GET /:id -> Users can view a specific payment
// Kept as a custom controller in case there's specific logic for ownership.
router.get('/:id', paymentController.getPaymentById);

// --- Admin/Staff Restricted Routes ---
router.use(authController.restrictTo('admin', 'staff'));

// GET all payments
router.get('/', factory.getAll(Payment));

// PATCH to /:id -> Updates one payment
// PATCH to / -> Updates many payments (from body)
router.patch('/:id?', factory.update(Payment));

// DELETE to /:id -> Deletes one payment
// DELETE to / -> Deletes many payments (from body)
router.delete('/:id?', factory.delete(Payment));

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const paymentController = require('../Controllers/paymentController');

// // Protected routes (require authentication)
// router.use(authController.protect);

// // User-accessible routes
// router.post('/', paymentController.newPayment); // Users can create payments
// router.get('/:id', paymentController.getPaymentById); // Users can view their payment

// // Admin/staff-only routes
// router.get('/', authController.restrictTo('admin', 'staff'), paymentController.getAllPayment); // View all payments
// router.patch('/:id', authController.restrictTo('admin', 'staff'), paymentController.updatePayment); // Update payment
// router.delete('/:id', authController.restrictTo('admin', 'staff'), paymentController.deletePayment); // Delete payment

// module.exports = router;