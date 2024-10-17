const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");

exports.getAllProduct = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message || "Failed to get products",
    });
  }
};

exports.newProduct = async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    console.log(newProduct);
    res.status(201).json({
      status: "success",
      data: {
        Product: newProduct,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message || err,
    });
  }
};
