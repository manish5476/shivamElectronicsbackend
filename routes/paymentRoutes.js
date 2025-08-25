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
