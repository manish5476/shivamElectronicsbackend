const express = require("express");
const router = express.Router();
const transactionController = require("../Controllers/transactionController");
const authController = require("../Controllers/authController");

// All routes in this file are protected and require authentication
router.use(authController.protect);

// GET /api/v1/transactions - Fetches all sales and payment transactions
// Query Params:
// - startDate (YYYY-MM-DD)
// - endDate (YYYY-MM-DD)
// - type ('sales' or 'payments')
// - paymentMethod ('credit_card', 'upi', etc.)
// - status ('paid', 'unpaid', 'pending', etc.)
router.get("/",authController.checkUserPermission("transaction:get"),transactionController.getAllTransactions,);
module.exports = router;
