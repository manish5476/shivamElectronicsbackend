const express = require("express");
const reviewController = require("../Controllers/reviewController");
const router = express.Router();
const authController = require("../Controllers/authController");
router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.createReview
  );

module.exports = router;