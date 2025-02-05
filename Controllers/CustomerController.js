

const Customer = require("./../Models/customerModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const handleFactory = require("./handleFactory");

const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const storage = multer.memoryStorage();
exports.upload = multer({ storage });

// exports.uploadProfileImage = async (req, res) => {
//     try {
//         const customerId = req.params.id;
//         const file = req.file;
//         if (!file) {
//             return res.status(400).json({ message: 'No file uploaded.' });
//         }
//         const fileName = `${Date.now()}_${file.originalname}`;
//         const { data, error } = await supabase.storage
//             .from(process.env.SUPABASE_BUCKET)
//             .upload(fileName, file.buffer, {
//                 contentType: file.mimetype,
//                 upsert: true,  
//             });

//         if (error) {
//             console.error('Supabase Upload Error:', error);
//             return res.status(500).json({ error: 'Failed to upload image.' });
//         }
//         const { publicURL } = supabase.storage
//             .from(process.env.SUPABASE_BUCKET)
//             .getPublicUrl(fileName);

//             const customer = await Customer.findByIdAndUpdate(
//             customerId,
//             { profileImg: publicURL },
//             { new: true }
//         );

//         if (!customer) {
//             return res.status(404).json({ message: 'Customer not found.' });
//         }

//         res.status(200).json({
//             message: 'Profile image uploaded successfully.',
//             profileImg: publicURL,
//         });
//     } catch (error) {
//         console.error('Upload Error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };
exports.uploadProfileImage = async (req, res) => {
  try {
      const customerId = req.params.id;   // Get customer ID from the route
      const file = req.file;              // Get the uploaded file

      if (!file) {
          return res.status(400).json({ message: 'No file uploaded.' });
      }

      // Generate a unique file name using the current timestamp
      const fileName = `${Date.now()}_${file.originalname}`;

      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
          .from(process.env.SUPABASE_BUCKET)
          .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              upsert: true,  // Allow overwriting the file if it already exists
          });

      if (error) {
          console.error('Supabase Upload Error:', error);
          return res.status(500).json({ error: 'Failed to upload image.' });
      }

      // Retrieve the public URL of the uploaded image
      const { publicURL } = supabase.storage
          .from(process.env.SUPABASE_BUCKET)
          .getPublicUrl(fileName);

      // Update the customer document with the new profile image URL
      const customer = await Customer.findByIdAndUpdate(
          customerId,
          { profileImg: publicURL },   // Update the profile image field
          { new: true }                 // Return the updated customer document
      );

      if (!customer) {
          return res.status(404).json({ message: 'Customer not found.' });
      }

      // Send the updated customer details and success message in the response
      res.status(200).json({
          message: 'Profile image uploaded successfully.',
          profileImg: publicURL,  // Send the URL of the uploaded image
      });
  } catch (error) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

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