const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
// const reviewRoutes = require('../routes/reviewRoutes');  // Import reviewRoutes
const handleFactory = require("./handleFactory");
const { Status } = require("git");
//get all data on the basis of the product
// ---------------------------------------------------------------------------------------------------------------------------------------

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
// ------------------------
exports.findDuplicateProduct = catchAsync(async (req, res, next) => {
  console.log("Checking for duplicate with SKU:", req.body.sku);
  const existingProduct = await Product.findOne({ sku: req.body.sku });
  console.log("Existing Product:", existingProduct);
  if (existingProduct) {
    return next(
      new AppError(
        `Product with this name already exists: ${req.body.sku}`,
        400
      )
    );
  }
  next();
});

//
exports.getProductWithIn = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  // Split latitude and longitude
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
  // Validate latitude and longitude
  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const products = await Product.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    Status: "success",
    results: products.length,
    data: {
      products,
    },
  });
  console.log(distance, lat, lng, unit);
});
//
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;

  // Split latitude and longitude
  const [lat, lng] = latlng.split(",");

  // Validate latitude and longitude
  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const distances = await Product.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: 0.001,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    Status: "success",
    results: products.length,
    data: {
      distances,
    },
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------
exports.getAllProduct = handleFactory.getAll(Product, { path: "reviews" });
exports.getProductById = handleFactory.getOne(Product, { path: "reviews" });
exports.newProduct = handleFactory.newOne(Product);
exports.deleteProduct = handleFactory.deleteOne(Product);
exports.updateProduct = handleFactory.updateOne(Product);

// ---------------------------------------------------------------------------------------------------------------------------------------

// exports.getProductById = catchAsync(async (req, res, next) => {
//   const product = await Product.findById(req.params.id).populate("reviews"); //here we are doing virtual populate with review
//   if (!product) {
//     return next(new AppError("Product not found with Id", 404));
//   }
//   res.status(200).json({
//     status: "success",
//     data: product,
//   });
// });
// =----------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------------
// exports.newProduct = catchAsync(async (req, res, next) => {
//   const existingProduct = await Product.findOne({ name: req.body.sku });
//   if (existingProduct) {
//     return next(
//       new AppError(
//         `Product with this name already exists by name  ${req.body.sku}`,
//         400
//       )
//     );
//   }

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
// exports.updateProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findByIdAndUpdate(req.params.id, req.body);
//   if (!product) {
//     return next(
//       new AppError(`Product not found with Id ${req.params.id}`, 404)
//     );
//   }
//   res.status(201).json({
//     status: "Success",
//     data: { product },
//   });
// });
// ---------------------------------------------------------------------------------------------------------------------------------------

//delete Product
// exports.deleteProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findByIdAndDelete(req.params.id);
//   if (!product) {
//     return next(new AppError("Product not found with Id", 404));
//   }
//   res.status(200).json({
//     Status: "success",
//     message: "Data deleted successfully",
//     data: null,
//   });
// });
// ---------------------------------------------------------------------------------------------------------------------------------------
// Get product dropDown data
// exports.getAllProduct = catchAsync(async (req, res, next) => {
//   const features = new ApiFeatures(
//     Product.find().populate("reviews"),
//     req.query
//   )
//     .filter()
//     .limitFields()
//     .sort()
//     .paginate();
//   const products = await features.query;
//   res.status(200).json({
//     status: "success",
//     result: products.length,
//     data: { products },
//   });
// });
