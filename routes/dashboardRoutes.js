const express = require('express');
const router = express.Router();
const dashboardController = require('../Controllers/dashboardControllers');
const authController = require('../Controllers/authController');

// --- Apply Protection to ALL Dashboard Routes ---
// This middleware ensures that only logged-in users can access any of the following routes.
router.use(authController.protect);

// --- Super Admin Only Routes ---
// Special routes that only a superAdmin can access.
router.get('/logs', authController.restrictTo('superAdmin'), dashboardController.getSystemLogs);

// --- Admin & Staff Routes ---
// All subsequent routes are now restricted to users with the 'admin' or 'staff' role.
router.use(authController.restrictTo('admin','superAdmin', 'staff'));

// --- Main Summary ---
router.get('/summary', dashboardController.getDashboardSummary);

// --- Sales Statistics ---
router.get('/sales/revenue', dashboardController.getTotalRevenue);
router.get('/sales/count', dashboardController.getSalesCount);
router.get('/sales/average-order-value', dashboardController.getAverageOrderValue);
router.get('/sales/trends', dashboardController.getSalesTrends);

// --- Chart-Specific Sales Data ---
router.get('/sales/charts', dashboardController.getSalesDataForCharts);
router.get('/sales/yearly', dashboardController.getYearlySalesByMonth);
router.get('/sales/monthly', dashboardController.getMonthlySalesByDay);
router.get('/sales/weekly', dashboardController.getWeeklySalesByDay);

// --- Product Statistics ---
router.get('/products/low-stock', dashboardController.getLowStockProducts);
router.get('/products/out-of-stock', dashboardController.getOutOfStockProducts);
router.get('/products/top-selling', dashboardController.getTopSellingProducts);
router.get('/products/inventory-value', dashboardController.getTotalInventoryValue);

// --- Customer Statistics ---
router.get('/customers/outstanding-payments', dashboardController.getCustomersWithOutstandingPayments);
router.get('/customers/top-by-purchase', dashboardController.getTopCustomersByPurchase);
router.get('/customers/new-count', dashboardController.getNewCustomersCount);

// --- Payment Statistics ---
router.get('/payments/total-received', dashboardController.getTotalPaymentsReceived);
router.get('/payments/by-method', dashboardController.getPaymentsByMethod);
router.get('/payments/failed-count', dashboardController.getFailedPaymentsCount);

// --- Review Statistics ---
router.get('/reviews/overall-average-rating', dashboardController.getOverallAverageRating);
router.get('/reviews/recent', dashboardController.getRecentReviews);

module.exports = router;