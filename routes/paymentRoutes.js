const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const paymentController= require("./../Controllers/paymentController");
const authController = require("./../Controllers/authController");
const reviewRoutes = require("../routes/reviewRoutes"); // Import reviewRoutes


// Product routes
router.route("/").get(authController.protect,authController.restrictTo("admin", "staff"),paymentController.getAllPayment).post(paymentController.newPayment);
router.route("/:id").get(paymentController.getPaymentById).patch(authController.restrictTo("admin", "staff"),paymentController.updatePayment).delete(authController.restrictTo("admin", "staff"),paymentController.deletePayment);
router.use("/:productId/reviews", reviewRoutes); // <-- Important part
module.exports = router;

