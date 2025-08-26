const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const invoiceController = require('../Controllers/InvoiceController');

// Import the factory and the Invoice model
const factory = require('../Controllers/handleFactory');
const Invoice = require('../Models/invoiceModel'); // Make sure this path is correct

// --- All routes are protected from this point ---
router.use(authController.protect);

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
