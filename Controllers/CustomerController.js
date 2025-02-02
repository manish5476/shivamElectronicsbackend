

const Customer = require("./../Models/customerModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const handleFactory = require("./handleFactory");

exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
    const phoneNumbers = req.body.phoneNumbers;
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return next(new AppError("Phone numbers are required to check for duplicates.", 400));
    }
      const numbersToCheck = phoneNumbers.map((item) => item.number);
  
    const existingCustomer = await Customer.findOne({
      phoneNumbers: { $elemMatch: { number: { $in: numbersToCheck } } },
    });
  
    // If a match is found, return an error
    if (existingCustomer) {
      return next(
        new AppError(
          `Customer with one of these phone numbers already exists: ${numbersToCheck.join(", ")}`,
          400
        )
      );
    }
    next();
  });
  // CRUD operations using handleFactory
exports.getAllCustomer = handleFactory.getAll(Customer);
exports.getCustomerById = handleFactory.getOne(Customer);
exports.newCustomer = handleFactory.newOne(Customer);
exports.updateCustomer = handleFactory.updateOne(Customer);
exports.deleteCustomer = handleFactory.deleteOne(Customer);
exports.deleteMultipleCustomer = handleFactory.deleteMultipleProduct(Customer);

// const { query } = require("express");
// const Customer = require("./../Models/customerModel");
// const catchAsync = require("../Utils/catchAsyncModule");
// const AppError = require("../Utils/appError");
// // const reviewRoutes = require('../routes/reviewRoutes');  // Import reviewRoutes
// const handleFactory = require("./handleFactory");
// const { Status } = require("git");


// exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
//     if (!req.body.phone) {
//       return next(new AppError("Phone number is required to check for duplicates.", 400));
//     }
  
//     const existingCustomer = await Customer.findOne({ phone: req.body.phone });
//     if (existingCustomer) {
//       return next(
//         new AppError(
//           `Customer with this phone number already exists: ${req.body.phone}`,
//           400
//         )
//       );
//     }
  
//     next();
//   });
  


// // exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
// //     // console.log("Checking for duplicate with SKU:", req.body.sku);
// //     const existingCustomer = await Customer.findOne({ sku: req.body.sku });
// //     // console.log("Existing Customer:", existingCustomer);
// //     if (existingCustomer) {
// //         return next(
// //             new AppError(
// //                 `Customer with this name already exists: ${req.body.sku}`,
// //                 400
// //             )
// //         );
// //     }
// // });

// exports.deleteMultipleCustomer = handleFactory.deleteMultipleProduct(Customer)
// exports.getAllCustomer = handleFactory.getAll(Customer);
// exports.getCustomerById = handleFactory.getOne(Customer);
// exports.newCustomer = handleFactory.newOne(Customer);
// exports.deleteCustomer = handleFactory.deleteOne(Customer);
// exports.updateCustomer = handleFactory.updateOne(Customer);