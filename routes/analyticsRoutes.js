const express = require('express');
const router = express.Router();
const analyticsController = require('../Controllers/analyticsController');
const authController = require('../Controllers/authController');

// Protect all routes in this file
router.use(authController.protect);

// --- Standard Analytics Routes ---
router.get('/sales-performance', authController.checkUserPermission('analytics:read_sales_performance'), analyticsController.getSalesPerformance);
router.get('/customer-insights', authController.checkUserPermission('analytics:read_customer_insights'), analyticsController.getCustomerInsights);
router.get('/product-performance', authController.checkUserPermission('analytics:read_product_performance'), analyticsController.getProductPerformance);
router.get('/payment-efficiency', authController.checkUserPermission('analytics:read_payment_efficiency'), analyticsController.getPaymentCollectionEfficiency);
router.get('/inventory-turnover', authController.checkUserPermission('analytics:read_inventory_turnover'), analyticsController.getInventoryTurnover);

// --- Advanced Analytics Routes ---
router.get('/sales-forecast', authController.checkUserPermission('analytics:read_sales_forecast'), analyticsController.getSalesForecast);
router.get('/customer-segments', authController.checkUserPermission('analytics:read_customer_segments'), analyticsController.getCustomerSegments);

module.exports = router;
