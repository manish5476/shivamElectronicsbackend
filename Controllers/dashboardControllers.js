// const Invoice = require('../Models/invoiceModel');
// const Product = require('../Models/productModel');
// const Customer = require('../Models/customerModel');
// const Payment = require('../Models/paymentModel');
// const Review = require('../Models/ReviewModel');
// const fs = require('fs').promises; // For async file operations
// const path = require('path');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// Import all the specialized controller functions
const salesStats = require('./dashboard/sales.stats');
const productStats = require('./dashboard/product.stats');
const customerStats = require('./dashboard/customer.stats');
const paymentStats = require('./dashboard/payment.stats');
const logsController = require('./dashboard/logs.controller');

// Re-export them all from this central file for easy access in your routes
module.exports = {
    ...salesStats,
    ...productStats,
    ...customerStats,
    ...paymentStats,
    ...logsController,
};



