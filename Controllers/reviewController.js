const { query } = require("express");
const Review = require("../Models/ReviewModel");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");

exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.productId) {
    filter = { product: req.params.productId };
  }
  // if (!req.body.product || !req.body.user) {
  //   return next(
  //     new AppError("Product and User information are required.", 400)
  //   );
  // }

  // if(!req.body.product){    req.body.tour=req.params.productId;  }
  // if(!req.body.user){    req.body.user=req.user.id;  }
  const review = await Review.find(filter);
  res.status(200).json({
    status: "success",
    result: review.length,
    data: { review },
  });
});

exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.product) {
    req.body.product = req.params.productId;
  }
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  console.log(req.body.product, req.body.user, "req.body.user");

  const newReview = await Review.create(req.body);
  console.log(req.body);
  console.log(newReview);
  res.status(201).json({
    status: "success",
    result: newReview.length,
    data: {
      review: newReview,
    },
  });
});
