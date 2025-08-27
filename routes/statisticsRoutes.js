const express = require('express');
const router = express.Router();
const statisticsController = require('../Controllers/statisticsController');
const authController = require('../Controllers/authController');

router.use(authController.protect);

router.get('/dashboard', authController.checkUserPermission('stats:read_dashboard'), statisticsController.getDashboardStats);
router.get('/top-products', authController.checkUserPermission('stats:read_top_products'), statisticsController.getTopSellingProducts);
router.get('/customer-payments', authController.checkUserPermission('stats:read_customer_payments'), statisticsController.getCustomerPaymentStats);
router.get('/sales-trend', authController.checkUserPermission('stats:read_sales_trend'), statisticsController.getMonthlySalesTrend);
router.get('/upcoming-emis', authController.checkUserPermission('stats:read_upcoming_emis'), statisticsController.getUpcomingEMIPayments);
router.get('/inventory', authController.checkUserPermission('stats:read_inventory'), statisticsController.getInventoryStatus);

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const statisticsController = require('../Controllers/statisticsController');
// const authController = require('../Controllers/authController');

// // Protect all routes and restrict to admin only
// router.use(authController.protect);
// router.use(authController.restrictTo('admin'));
// // Dashboard overview statistics
// router.get('/dashboard', statisticsController.getDashboardStats);
// // Top selling products
// router.get('/top-products', statisticsController.getTopSellingProducts);
// // Customer payment statistics
// router.get('/customer-payments', statisticsController.getCustomerPaymentStats);
// // Monthly sales trend
// router.get('/sales-trend', statisticsController.getMonthlySalesTrend);
// // Upcoming EMI payments
// router.get('/upcoming-emis', statisticsController.getUpcomingEMIPayments);
// // Inventory status
// router.get('/inventory', statisticsController.getInventoryStatus);
// module.exports = router; 