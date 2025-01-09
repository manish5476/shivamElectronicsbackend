
const { query } = require("express");
const Customer = require("./../Models/customerModel");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
// const reviewRoutes = require('../routes/reviewRoutes');  // Import reviewRoutes
const handleFactory = require("./handleFactory");
const { Status } = require("git");



exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
    console.log("Checking for duplicate with SKU:", req.body.sku);
    const existingCustomer = await Customer.findOne({ sku: req.body.sku });
    console.log("Existing Customer:", existingCustomer);
    if (existingCustomer) {
        return next(
            new AppError(
                `Customer with this name already exists: ${req.body.sku}`,
                400
            )
        );
    }
    next();
});


exports.getAllCustomer = handleFactory.getAll(Customer);
exports.getCustomerById = handleFactory.getOne(Customer);
exports.newCustomer = handleFactory.newOne(Customer);
exports.deleteCustomer = handleFactory.deleteOne(Customer);
exports.updateCustomer = handleFactory.updateOne(Customer);