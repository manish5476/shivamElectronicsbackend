const express = require("express");
const reviewController = require("../Controllers/reviewController");
const router = express.Router({ mergeParams: true }); // <-- This line is correct
const authController = require("../Controllers/authController");

// Route to handle reviews
router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.setUserProductIds,
    reviewController.createReview
  );

router
  .route("/:id")
  .patch(
    authController.restrictTo("user", "admin"),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview
  )
  .get(authController.restrictTo("user", "admin"), reviewController.reviewById);
module.exports = router;

// const express = require("express");
// const reviewController = require("../Controllers/reviewController");
// const router = express.Router({mergeParams:true});
// const authController = require("../Controllers/authController");
// router
//   .route("/")
//   .get(reviewController.getAllReviews)
//   .post(
//     authController.protect,
//     authController.restrictTo("user"),
//     reviewController.createReview
//   );

// module.exports = router;
