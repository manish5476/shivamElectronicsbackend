const express = require('express');
const router = express.Router();
const statisticsController = require('../Controllers/statisticsController');
const authController = require('../Controllers/authController');

// Protect all routes and restrict to admin only
router.use(authController.protect);
router.use(authController.restrictTo('admin'));
// Dashboard overview statistics
router.get('/dashboard', statisticsController.getDashboardStats);
// Top selling products
router.get('/top-products', statisticsController.getTopSellingProducts);
// Customer payment statistics
router.get('/customer-payments', statisticsController.getCustomerPaymentStats);
// Monthly sales trend
router.get('/sales-trend', statisticsController.getMonthlySalesTrend);
// Upcoming EMI payments
router.get('/upcoming-emis', statisticsController.getUpcomingEMIPayments);
// Inventory status
router.get('/inventory', statisticsController.getInventoryStatus);
module.exports = router; 