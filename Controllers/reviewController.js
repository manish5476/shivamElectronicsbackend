const Review = require("../Models/ReviewModel");
const handleFactory = require("./handleFactory");

/**
 * Middleware to set product and user IDs on the request body before creating a review.
 * This is used for nested routes like /products/:productId/reviews
 */
exports.setUserAndProductIds = (req, res, next) => {
    // For nested routes, get the product ID from the URL parameters
    if (req.params.productId) {
        req.body.product = req.params.productId;
    }

    // Get the user ID from the authenticated user (set by the 'protect' middleware)
    // The 'user' field on the review schema represents the author of the review.
    req.body.user = req.user.id;
    
    next();
};

// --- Use the handleFactory for all standard CRUD operations ---

// GET all reviews. The factory handles owner-based filtering.
exports.getAllReviews = handleFactory.getAll(Review);

// GET a single review by its ID.
exports.getReview = handleFactory.getOne(Review);

// POST a new review. The middleware above provides the necessary IDs.
exports.createReview = handleFactory.create(Review);

// PATCH to update a review.
exports.updateReview = handleFactory.update(Review);

// DELETE a review.
exports.deleteReview = handleFactory.delete(Review);