const express = require('express');
const router = express.Router();
const emiController = require('../Controllers/emiController');
const authController = require('../Controllers/authController');

router.use(authController.protect);

// Create an EMI plan from an invoice
router.post('/from-invoice/:invoiceId', authController.checkUserPermission('emi:create'), emiController.createEmiFromInvoice);

// Record a payment for a specific installment
router.post('/:emiId/installments/:installmentId/pay', authController.checkUserPermission('emi:update'), emiController.recordEmiPayment);

// Get the dashboard report of upcoming and overdue EMIs
router.get('/status-report', authController.checkUserPermission('emi:read_report'), emiController.getEmiStatusReport);

module.exports = router;
