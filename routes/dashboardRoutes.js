// const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const dashbord = 





const express = require('express');
const router = express.Router();
const dashboardController = require('../Controllers/dashboardControllers');
// const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware'); // Optional: Authentication

// --- DASHBOARD ROUTES ---
// All routes are prefixed with /api/v1/dashboard (defined in server.js)

/**
 * @route GET /summary
 * @description Get a consolidated summary of key dashboard metrics.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period e.g., 'today', 'yesterday', 'week', 'month', 'last_month', 'year'.
 * @queryparam {String} [startDate] - Custom start date (YYYY-MM-DD). Overrides period if endDate is also present.
 * @queryparam {String} [endDate] - Custom end date (YYYY-MM-DD). Overrides period if startDate is also present.
 * @queryparam {Number} [lowStockThreshold=10] - Threshold for low stock products.
 * @queryparam {Number} [listLimits=5] - Default limit for lists like top products, customers with dues.
 */
router.get('/summary', /* isAuthenticated, isAdmin, */ dashboardController.getDashboardSummary);

// --- Sales Statistics ---
/**
 * @route GET /sales/revenue
 * @description Get total sales revenue.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/sales/revenue', /* isAuthenticated, isAdmin, */ dashboardController.getTotalRevenue);

/**
 * @route GET /sales/count
 * @description Get total number of sales.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/sales/count', /* isAuthenticated, isAdmin, */ dashboardController.getSalesCount);

/**
 * @route GET /sales/average-order-value
 * @description Get average order value.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/sales/average-order-value', /* isAuthenticated, isAdmin, */ dashboardController.getAverageOrderValue);

/**
 * @route GET /sales/trends
 * @description Get sales data grouped by day for trend charts.
 * @access Private (Admin)
 * @queryparam {Number} [days=30] - Number of past days to fetch trends for.
 */
router.get('/sales/trends', /* isAuthenticated, isAdmin, */ dashboardController.getSalesTrends);

// --- Product Statistics ---
/**
 * @route GET /products/low-stock
 * @description Get products that are low in stock.
 * @access Private (Admin)
 * @queryparam {Number} [threshold=10] - Stock quantity below which a product is considered low stock.
 * @queryparam {Number} [limit=10] - Maximum number of products to return.
 */
router.get('/products/low-stock', /* isAuthenticated, isAdmin, */ dashboardController.getLowStockProducts);

/**
 * @route GET /products/out-of-stock
 * @description Get products that are out of stock.
 * @access Private (Admin)
 * @queryparam {Number} [limit=10] - Maximum number of products to return.
 */
router.get('/products/out-of-stock', /* isAuthenticated, isAdmin, */ dashboardController.getOutOfStockProducts);

/**
 * @route GET /products/top-selling
 * @description Get top-selling products by revenue or quantity.
 * @access Private (Admin)
 * @queryparam {Number} [limit=5] - Maximum number of products to return.
 * @queryparam {String} [sortBy='revenue'] - Criteria to sort by ('revenue' or 'quantity').
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/products/top-selling', /* isAuthenticated, isAdmin, */ dashboardController.getTopSellingProducts);

/**
 * @route GET /products/inventory-value
 * @description Get the total monetary value of current inventory.
 * @access Private (Admin)
 */
router.get('/products/inventory-value', /* isAuthenticated, isAdmin, */ dashboardController.getTotalInventoryValue);

// --- Customer Statistics ---
/**
 * @route GET /customers/outstanding-payments
 * @description Get customers with outstanding (remaining) payments.
 * @access Private (Admin)
 * @queryparam {Number} [limit=10] - Maximum number of customers to return.
 */
router.get('/customers/outstanding-payments', /* isAuthenticated, isAdmin, */ dashboardController.getCustomersWithOutstandingPayments);

/**
 * @route GET /customers/top-by-purchase
 * @description Get top customers by their total purchase amount.
 * @access Private (Admin)
 * @queryparam {Number} [limit=5] - Maximum number of customers to return.
 * @queryparam {String} [period] - Predefined period for calculating purchase amount (if not using stored total).
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/customers/top-by-purchase', /* isAuthenticated, isAdmin, */ dashboardController.getTopCustomersByPurchase);

/**
 * @route GET /customers/new-count
 * @description Get the count of new customers.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/customers/new-count', /* isAuthenticated, isAdmin, */ dashboardController.getNewCustomersCount);

// --- Payment Statistics ---
/**
 * @route GET /payments/total-received
 * @description Get total amount of completed payments.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/payments/total-received', /* isAuthenticated, isAdmin, */ dashboardController.getTotalPaymentsReceived);

/**
 * @route GET /payments/by-method
 * @description Get payment amounts grouped by payment method.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/payments/by-method', /* isAuthenticated, isAdmin, */ dashboardController.getPaymentsByMethod);

/**
 * @route GET /payments/failed-count
 * @description Get count of failed payments.
 * @access Private (Admin)
 * @queryparam {String} [period] - Predefined period.
 * @queryparam {String} [startDate] - Custom start date.
 * @queryparam {String} [endDate] - Custom end date.
 */
router.get('/payments/failed-count', /* isAuthenticated, isAdmin, */ dashboardController.getFailedPaymentsCount);


// --- Review Statistics ---
/**
 * @route GET /reviews/overall-average-rating
 * @description Get the overall average product rating from all reviews.
 * @access Private (Admin)
 */
router.get('/reviews/overall-average-rating', /* isAuthenticated, isAdmin, */ dashboardController.getOverallAverageRating);

/**
 * @route GET /reviews/recent
 * @description Get recent product reviews.
 * @access Private (Admin)
 * @queryparam {Number} [limit=5] - Maximum number of reviews to return.
 */
router.get('/reviews/recent', /* isAuthenticated, isAdmin, */ dashboardController.getRecentReviews);



// New routes
/**
 * @route GET /sales/yearly
 * @description Get sales data for a specific year, grouped by month
 * @access Private (Admin)
 * @queryparam {Number} [ ] - The year to fetch sales for (default: current year)
 */
router.get('/sales/yearly', /* isAuthenticated, isAdmin, */ dashboardController.getYearlySalesByMonth);

/**
 * @route GET /sales/monthly
 * @description Get sales data for a specific month and year, grouped by day
 * @access Private (Admin)
 * @queryparam {Number} [year] - The year (default: current year)
 * @queryparam {Number} [month] - The month (1-12, default: current month)
 */
router.get('/sales/monthly', /* isAuthenticated, isAdmin, */ dashboardController.getMonthlySalesByDay);

/**
 * @route GET /sales/weekly
 * @description Get sales data for a specific week and year, grouped by day
 * @access Private (Admin)
 * @queryparam {Number} [year] - The year (default: current year)
 * @queryparam {Number} [week] - The ISO week number (1-53, default: current week)
 */
router.get('/sales/weekly', /* isAuthenticated, isAdmin, */ dashboardController.getWeeklySalesByDay);

// New route
/**
 * @route GET /sales/charts
 * @description Get sales data for yearly, monthly, and weekly charts for a specific year
 * @access Private (Admin)
 * @queryparam {Number} [year] - The year to fetch sales for (default: current year)
 */
router.get('/sales/charts', /* isAuthenticated, isAdmin, */ dashboardController.getSalesDataForCharts);


module.exports = router;