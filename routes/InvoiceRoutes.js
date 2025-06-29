const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const invoiceController = require('../Controllers/InvoiceController');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/:id', invoiceController.getInvoiceById); // Users can view their invoice

// Admin/staff-only routes
router.get('/', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.getAllInvoice); // View all invoices
router.post('/', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.findDuplicateInvoice, invoiceController.newInvoice); 
router.patch('/:id', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.updateInvoice); // Update invoice
router.delete('/:id', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.deleteInvoice); // Delete invoice
router.post('/productSales', authController.protect, authController.restrictTo('admin', 'staff', 'superAdmin'), invoiceController.getProductSales); // Delete invoice
module.exports = router;