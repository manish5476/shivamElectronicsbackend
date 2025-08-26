const express = require('express');
const authController = require('../Controllers/authController');
const reviewController = require('../Controllers/reviewController');

const router = express.Router({ mergeParams: true });
router.use(authController.protect);

router.route('/')
  .get(authController.checkUserPermission('review:read_all'), reviewController.getAllReviews)
  .post(
    authController.checkUserPermission('review:create'),
    reviewController.setUserAndProductIds,
    reviewController.createReview
  );

router.route('/:id')
  .get(authController.checkUserPermission('review:read_one'), reviewController.getReview)
  .patch(authController.checkUserPermission('review:update'), reviewController.updateReview)
  .delete(authController.checkUserPermission('review:delete'), reviewController.deleteReview);

module.exports = router;
// const express = require('express');
// const authController = require('../Controllers/authController');
// const reviewController = require('../Controllers/reviewController');

// // This allows the router to access params from parent routers (like :productId from productRoutes)
// const router = express.Router({ mergeParams: true });
// router.use(authController.protect);
// router.route('/')
//   .get(reviewController.getAllReviews)
//   .post(
//     authController.restrictTo('user'), // Only users can write reviews
//     reviewController.setUserAndProductIds, // Use the updated middleware name
//     reviewController.createReview
//   );

// router.route('/:id')
//   .get(reviewController.getReview) // Use the updated function name 'getReview'
//   .patch(authController.restrictTo('user', 'admin','superAdmin'), reviewController.updateReview)
//   .delete(authController.restrictTo('user', 'admin','superAdmin'), reviewController.deleteReview);

// module.exports = router;