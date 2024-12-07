const { query } = require("express");
const Review = require("../Models/ReviewModel");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const handleFactory = require("./handleFactory");

exports.setUserProductIds = (req, res, next) => {
  if (!req.body.product) {
    req.body.product = req.params.productId;
  }
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  next();
};
exports.getAllReviews = handleFactory.getAll(Review);
exports.reviewById = handleFactory.getOne(Review, { path: "product" });
exports.createReview = handleFactory.newOne(Review);
exports.updateReview = handleFactory.updateOne(Review);
exports.deleteReview = handleFactory.deleteOne(Review);

// const { query } = require("express");
// const Review = require("../Models/ReviewSchema");
// const Product = require("./../Models/productModel");
// const ApiFeatures = require("../Utils/ApiFeatures");
// const AppError = require("../Utils/appError");
// const catchAsync = require("../Utils/catchAsyncModule");

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   // if(!req.body.product){    req.body.tour=req.params.productId;  }
//   // if(!req.body.user){    req.body.user=req.user.id;  }
//   const review = await Review.find();
//   res.status(200).json({
//     status: "success",
//     result: review.lengh,
//     data: { review },
//   });
// });

// exports.createReview = catchAsync(async (req, res, next) => {
//   if(!req.body.product){ req.body.product=req.params.productId;  }
//   if(!req.body.user){req.body.user=req.user.id;  }
//   console.log(req.body.product,req.body.user,"req.body.user")

//   const newReview = await Review.create(req.body);
//   console.log(req.body)
//   console.log(newReview)
//   res.status(201).json({
//     status: "success",
//     result: newReview.lengh,
//     data: {
//       review: newReview,
//     },
//   });
// });
// exports.createReview = catchAsync(async (req, res, next) => {
//   if (!req.body.product) {
//     req.body.product = req.params.productId;
//   }
//   if (!req.body.user) {
//     req.body.user = req.user.id;
//   }
//   console.log(req.body.user);
//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: "success",
//     result: newReview.length,
//     data: {
//       review: newReview,
//     },
//   });
// });
// exports.getAllReviews = catchAsync(async (req, res, next) => {
// let filter = {};
// if (req.params.productId) filter = { product: req.params.productID };
// const reviews = await Review.find(filter);

//   const productId = req.params.productId;
//   const reviews = await Review.find({ product: productId });
//   res.status(200).json({
//     status: "success",
//     result: reviews.length,
//     data: { reviews },
//   });
// });
