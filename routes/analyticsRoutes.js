const express = require('express');
const router = express.Router();
const analyticsController = require('../Controllers/analyticsController');
const authController = require('../Controllers/authController');

// Protect all routes and restrict to admin only
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Sales performance metrics
router.get('/sales-performance', analyticsController.getSalesPerformance);

// Customer insights
router.get('/customer-insights', analyticsController.getCustomerInsights);

// Product performance analysis
router.get('/product-performance', analyticsController.getProductPerformance);

// Payment collection efficiency
router.get('/payment-efficiency', analyticsController.getPaymentCollectionEfficiency);

// Inventory turnover rate
router.get('/inventory-turnover', analyticsController.getInventoryTurnover);

module.exports = router; 