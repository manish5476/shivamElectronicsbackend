const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
//get all data on the basis of the product
exports.getAllProduct = catchAsync(async (req, res) => {
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

//   try {
//   } catch (err) {
//     res.status(400).json({
//       status: "fail",
//       message: err.message || "Failed to get products",
//     });
//   }
// };

// const catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//   };
// };

//Create new Product
exports.newProduct = catchAsync(async (req, res) => {
  const newProduct = await Product.create(req.body);
  console.log(newProduct);
  res.status(201).json({
    status: "success",
    data: {
      Product: newProduct,
    },
  });
});

//   try {
//     const newProduct = await Product.create(req.body);
//     console.log(newProduct);
//     res.status(201).json({
//       status: "success",
//       data: {
//         Product: newProduct,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: "fail",
//       message: err.message || err,
//     });
//   }
// };
//update Product
exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body);
  rea.status(201).json({
    status: "Success",
    data: { product },
  });
});
// try {
//   } catch (err) {
//     res.status(400).json({
//       status: "fail",
//       message: err.message || err,
//     });
//   }
// };

//Delete methodds
exports.deleteProduct = catchAsync(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json({
    Status: "success",
    message: "Data deleted successfully",
    data: null,
  });
});
//   try {
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: "Data Not Found",
//     });
//   }
// };

// Get product dropDown data
exports.getProductDropDownWithId = catchAsync(async (req, res) => {
  const products = await Product.find().select("modelName modelCode _id");
  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});
//   try {
//   } catch (err) {
//     res.status(400).json({
//       status: "fail",
//       message: err.message,
//     });
//   }
// };
