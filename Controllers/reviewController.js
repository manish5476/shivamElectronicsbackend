const Review = require("../Models/ReviewModel");
const Product = require("./../Models/productModel"); // Product model is likely for linking reviews
const ApiFeatures = require("../Utils/ApiFeatures"); // Still good to have for custom queries if needed
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const handleFactory = require("./handleFactory");

// It's assumed that all routes using these handlers are protected by authController.protect middleware,
// which populates req.user with the authenticated user's details (including role and _id).

exports.setUserProductIds = (req, res, next) => {
  // Ensure the product ID is set from params or body
  if (!req.body.product && req.params.productId) {
    req.body.product = req.params.productId;
  }

  // Ensure the user ID (who created/owns the review) is set
  // This `user` field typically refers to the review *writer*.
  // The `owner` field (for multi-tenancy) will be automatically set by handleFactory.newOne.
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  next();
};

// Use handleFactory for all standard CRUD operations.
// The handleFactory functions already incorporate the owner filter and super admin bypass logic.

// getAllReviews: Will fetch reviews owned by the current user, or all reviews if super admin.
exports.getAllReviews = handleFactory.getAll(Review);

// reviewById: Will fetch a specific review if owned by the current user, or any review if super admin.
// Populates the 'product' field of the review.
exports.reviewById = handleFactory.getOne(Review, { path: "product" });

// createReview: Will create a new review. The 'owner' field will automatically be set to req.user._id
// by handleFactory.newOne, ensuring the review is owned by the creator.
// Assumes `setUserProductIds` middleware runs before this.
exports.createReview = handleFactory.newOne(Review);

// updateReview: Will update a review if owned by the current user, or any review if super admin.
exports.updateReview = handleFactory.updateOne(Review);

// deleteReview: Will delete a review if owned by the current user, or any review if super admin.
exports.deleteReview = handleFactory.deleteOne(Review);

// const { query } = require("express");
// const Review = require("../Models/ReviewModel");
// const Product = require("./../Models/productModel");
// const ApiFeatures = require("../Utils/ApiFeatures");
// const AppError = require("../Utils/appError");
// const catchAsync = require("../Utils/catchAsyncModule");
// const handleFactory = require("./handleFactory");

// exports.setUserProductIds = (req, res, next) => {
//   if (!req.body.product) {
//     req.body.product = req.params.productId;
//   }
//   if (!req.body.user) {
//     req.body.user = req.user.id;
//   }
//   next();
// };
// exports.getAllReviews = handleFactory.getAll(Review);
// exports.reviewById = handleFactory.getOne(Review, { path: "product" });
// exports.createReview = handleFactory.newOne(Review);
// exports.updateReview = handleFactory.updateOne(Review);
// exports.deleteReview = handleFactory.deleteOne(Review);

// // const { query } = require("express");
// // const Review = require("../Models/ReviewSchema");
// // const Product = require("./../Models/productModel");
// // const ApiFeatures = require("../Utils/ApiFeatures");
// // const AppError = require("../Utils/appError");
// // const catchAsync = require("../Utils/catchAsyncModule");

// // exports.getAllReviews = catchAsync(async (req, res, next) => {
// //   // if(!req.body.product){    req.body.tour=req.params.productId;  }
// //   // if(!req.body.user){    req.body.user=req.user.id;  }
// //   const review = await Review.find();
// //   res.status(200).json({
// //     status: "success",
// //     result: review.lengh,
// //     data: { review },
// //   });
// // });

// // exports.createReview = catchAsync(async (req, res, next) => {
// //   if(!req.body.product){ req.body.product=req.params.productId;  }
// //   if(!req.body.user){req.body.user=req.user.id;  }
// //   console.log(req.body.product,req.body.user,"req.body.user")

// //   const newReview = await Review.create(req.body);
// //   console.log(req.body)
// //   console.log(newReview)
// //   res.status(201).json({
// //     status: "success",
// //     result: newReview.lengh,
// //     data: {
// //       review: newReview,
// //     },
// //   });
// // });
// // exports.createReview = catchAsync(async (req, res, next) => {
// //   if (!req.body.product) {
// //     req.body.product = req.params.productId;
// //   }
// //   if (!req.body.user) {
// //     req.body.user = req.user.id;
// //   }
// //   console.log(req.body.user);
// //   const newReview = await Review.create(req.body);
// //   res.status(201).json({
// //     status: "success",
// //     result: newReview.length,
// //     data: {
// //       review: newReview,
// //     },
// //   });
// // });
// // exports.getAllReviews = catchAsync(async (req, res, next) => {
// // let filter = {};
// // if (req.params.productId) filter = { product: req.params.productID };
// // const reviews = await Review.find(filter);

// //   const productId = req.params.productId;
// //   const reviews = await Review.find({ product: productId });
// //   res.status(200).json({
// //     status: "success",
// //     result: reviews.length,
// //     data: { reviews },
// //   });
// // });
