const { query } = require("express");
const Review = require("../Models/ReviewSchema");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const review = await Review.find();
  res.status(200).json({
    status: "success",
    result: review.lengh,
    data: { review },
  });
});

exports.newReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create(req.body);
  res.status(201).json({
    status: "success",
    result: newReview.lengh,
    data: {
      review: newReview,
    },
  });
});
