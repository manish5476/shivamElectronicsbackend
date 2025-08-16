const express = require('express');
const authController = require('../Controllers/authController');
const reviewController = require('../Controllers/reviewController');

// This allows the router to access params from parent routers (like :productId from productRoutes)
const router = express.Router({ mergeParams: true });
router.use(authController.protect);
router.route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'), // Only users can write reviews
    reviewController.setUserAndProductIds, // Use the updated middleware name
    reviewController.createReview
  );

router.route('/:id')
  .get(reviewController.getReview) // Use the updated function name 'getReview'
  .patch(authController.restrictTo('user', 'admin','superAdmin'), reviewController.updateReview)
  .delete(authController.restrictTo('user', 'admin','superAdmin'), reviewController.deleteReview);

module.exports = router;