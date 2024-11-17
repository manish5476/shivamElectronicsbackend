const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
//get all data on the basis of the product
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

exports.newProduct = catchAsync(async (req, res, next) => {
  const newProduct = await Product.create(req.body);
  console.log(newProduct);
  res.status(201).json({
    status: "success",
    data: {
      Product: newProduct,
    },
  });
});

//update Product
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body);
  res.status(201).json({
    status: "Success",
    data: { product },
  });
});

//delete Product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json({
    Status: "success",
    message: "Data deleted successfully",
    data: null,
  });
});

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
