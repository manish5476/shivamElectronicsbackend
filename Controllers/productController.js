const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
//get all data on the basis of the product
// ---------------------------------------------------------------------------------------------------------------------------------------

exports.getAllProduct = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(Product.find(), req.query)
    .filter()
    .limitFields()
    .sort()
    .paginate();
  const products = await features.query;
  res.status(200).json({
    status: "success",
    result: products.length,
    data: { products },
  });
});
// ---------------------------------------------------------------------------------------------------------------------------------------

exports.getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate("reviews");//here we are doing virtual populate with review
  if (!product) {
    return next(new AppError("Product not found with Id", 404));
  }

  res.status(200).json({
    status: "success",
    data: product,
  });
});
// ---------------------------------------------------------------------------------------------------------------------------------------

exports.newProduct = catchAsync(async (req, res, next) => {
  const existingProduct = await Product.findOne({ name: req.body.sku });
  if (existingProduct) {
    return next(
      new AppError(
        `Product with this name already exists by name  ${req.body.sku}`,
        400
      )
    );
  }

  const newProduct = await Product.create(req.body);
  if (!newProduct) {
    return next(new AppError("Failed to create product", 400));
  }
  res.status(201).json({
    status: "success",
    data: {
      Product: newProduct,
    },
  });
});
// ---------------------------------------------------------------------------------------------------------------------------------------

//  exports.newProduct = catchAsync(async (req, res, next) => {
//   const newProduct = await Product.create(req.body);

//   if (!newProduct) {
//     return next(new AppError("Failed to create product", 400));
//   }
//   res.status(201).json({
//     status: "success",
//     data: {
//       Product: newProduct,
//     },
//   });
// });
// ---------------------------------------------------------------------------------------------------------------------------------------

//update Product
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body);
  if (!product) {
    return next(
      new AppError(`Product not found with Id ${req.params.id}`, 404)
    );
  }
  res.status(201).json({
    status: "Success",
    data: { product },
  });
});
// ---------------------------------------------------------------------------------------------------------------------------------------

//delete Product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError("Product not found with Id", 404));
  }
  res.status(200).json({
    Status: "success",
    message: "Data deleted successfully",
    data: null,
  });
});
// ---------------------------------------------------------------------------------------------------------------------------------------
// Get product dropDown data
exports.getProductDropDownWithId = catchAsync(async (req, res, next) => {
  const products = await Product.find().select("modelName modelCode _id");

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

//get product stats
// ---------------------------------------------------------------------------------------------------------------------------------------
exports.getProductStats = catchAsync(async (req, res, next) => {
  const stat = await Product.aggregate([
    {
      $match: { listPrice: { gte: 400 } },
    },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: "$listPrice" },
        maxPrice: { $max: "$listPrice" },
        minPrice: { $min: "$listPrice" },
        count: { $sum: 1 },
      },
    },
  ]);
});
// ---------------------------------------------------------------------------------------------------------------------------------------
