const express = require("express");
const router = express.Router();
const advancedAnalyticsController = require("../Controllers/advancedAnalyticsController");
const authController = require("../Controllers/authController");

router.use(authController.protect);
router.use(authController.restrictTo("admin", "superAdmin")); // Restrict to admins

router.get("/sales-forecast", advancedAnalyticsController.getSalesForecast);
router.get(
  "/customer-segments",
  advancedAnalyticsController.getCustomerSegments,
);

module.exports = router;
