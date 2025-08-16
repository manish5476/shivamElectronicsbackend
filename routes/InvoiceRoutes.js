const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const invoiceController = require('../Controllers/InvoiceController');

// Import the factory and the Invoice model
const factory = require('../Controllers/handleFactory');
const Invoice = require('../Models/invoiceModel'); // Make sure this path is correct

// --- All routes are protected from this point ---
router.use(authController.protect);

// --- User-accessible route ---
// This allows a user to view a specific invoice they own.
// This is kept as a custom controller function assuming it has special logic.
router.get('/:id', invoiceController.getInvoiceById);

// --- Admin/Staff/SuperAdmin Restricted Routes ---
router.use(authController.restrictTo('admin', 'staff', 'superAdmin'));

// GET all invoices
router.get('/', factory.getAll(Invoice));

// POST to / -> Creates one or many invoices
// Your findDuplicateInvoice middleware will run before the factory function.
router.post('/', invoiceController.findDuplicateInvoice, factory.create(Invoice));

// CUSTOM ROUTE: Get product sales data
router.post('/productSales', invoiceController.getProductSales);

// PATCH to /:id -> Updates one invoice
// PATCH to / -> Updates many invoices (from body)
router.patch('/:id?', factory.update(Invoice));

// DELETE to /:id -> Deletes one invoice
// DELETE to / -> Deletes many invoices (from body)
router.delete('/:id?', factory.delete(Invoice));

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const invoiceController = require('../Controllers/InvoiceController');

// // Protected routes (require authentication)
// router.use(authController.protect);

// // User-accessible routes
// router.get('/:id', invoiceController.getInvoiceById); // Users can view their invoice

// router.get('/', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.getAllInvoice); // View all invoices
// router.post('/', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.findDuplicateInvoice, invoiceController.newInvoice); 
// router.patch('/:id', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.updateInvoice); // Update invoice
// router.delete('/:id', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.deleteInvoice); // Delete invoice
// router.post('/productSales', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.getProductSales); // Delete invoice
// module.exports = router;