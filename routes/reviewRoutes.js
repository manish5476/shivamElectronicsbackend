const express = require('express');
const router = express.Router({ mergeParams: true });
const authController = require('../Controllers/authController');
const reviewController = require('../Controllers/reviewController');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/', reviewController.getAllReviews); // Users can view reviews
router.post('/', authController.restrictTo('user'), reviewController.setUserProductIds, reviewController.createReview); // Users can create reviews

// Mixed access (user can manage their own, admin can manage all)
router.patch('/:id', authController.restrictTo('user', 'admin'), reviewController.updateReview); // User or admin
router.delete('/:id', authController.restrictTo('user', 'admin'), reviewController.deleteReview); // User or admin
router.get('/:id', authController.restrictTo('user', 'admin'), reviewController.reviewById); // User or admin

module.exports = router;