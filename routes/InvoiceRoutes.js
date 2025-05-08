const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const invoiceController = require('../Controllers/InvoiceController');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/:id', invoiceController.getInvoiceById); // Users can view their invoice

// Admin/staff-only routes
router.post('/', authController.restrictTo('admin', 'staff'), invoiceController.getAllInvoice); // View all invoices
router.post('/', authController.restrictTo('admin', 'staff'), invoiceController.findDuplicateInvoice, invoiceController.newInvoice); // Create invoice
router.patch('/:id', authController.restrictTo('admin', 'staff'), invoiceController.updateInvoice); // Update invoice
router.delete('/:id', authController.restrictTo('admin', 'staff'), invoiceController.deleteInvoice); // Delete invoice
router.post('/productSales', authController.restrictTo('admin', 'staff'), invoiceController.getProductSales); // Delete invoice
module.exports = router;