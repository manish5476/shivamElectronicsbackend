const Customer = require('../Models/customerModel'); // Your modified Customer model
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const storage = multer.memoryStorage();
const upload = multer({ storage });
const handleFactory = require('./handleFactory'); // Your generic factory handler

// Make sure your routes for these handlers are protected by `authController.protect` middleware.
// Example: router.get('/', protect, customerController.getAllCustomer);

// --- 1. Upload Profile Image ---
exports.uploadProfileImage = [
  upload.single('profileImg'),
  catchAsync(async (req, res, next) => {
    const customerId = req.params.id;
    const file = req.file;
    const userId = req.user._id; // Get the authenticated user's ID

    if (!file) return next(new AppError('No file uploaded', 400));

    const fileName = `${Date.now()}_${file.originalname}`;
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true }); // Corrected mimeType to mimetype
    if (error) return next(new AppError('Failed to upload image', 500));

    const { publicUrl } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName); // Corrected publicURL to publicUrl

    // Find and update the customer by ID AND ensure it belongs to the current user
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, owner: userId }, // Crucial: Filter by owner
      { profileImg: publicUrl }, // Use publicUrl here
      { new: true }
    );

    if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Profile image uploaded successfully',
      data: { profileImg: publicUrl },
    });
  }),
];

// --- 2. Find Duplicate Customer (Per User) ---
exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
  const phoneNumbers = req.body.phoneNumbers;
  const userId = req.user._id; // Get the authenticated user's ID

  if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
    return next(new AppError('Phone numbers must be an array', 400));
  }
  const numbersToCheck = phoneNumbers.map(item => item.number);

  // Find a duplicate customer by phone number AND ensure it belongs to the current user
  const existingCustomer = await Customer.findOne({
    owner: userId, // Crucial: Filter by owner
    'phoneNumbers.number': { $in: numbersToCheck },
  });

  if (existingCustomer) {
    return next(new AppError(`Customer with phone number(s) ${numbersToCheck.join(', ')} already exists for this user.`, 400));
  }
  next();
});

// --- 3. Create New Customer ---
exports.newCustomer = [
  body('email').isEmail().withMessage('Invalid email'),
  body('fullname').notEmpty().withMessage('Full name is required'),
  body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
    }

    const { email, phoneNumbers, fullname, ...otherData } = req.body;
    const userId = req.user._id; // Get the authenticated user's ID

    // Find customer by email AND owner to check for reactivation or duplication per user
    let customer = await Customer.findOne({ email, owner: userId }); // Crucial: Filter by owner

    if (customer) {
      if (customer.status === 'inactive') {
        // Reactivate customer belonging to the current user
        customer = await Customer.findByIdAndUpdate(
          customer._id,
          { status: 'active', phoneNumbers, fullname, ...otherData },
          { new: true }
        );
        return res.status(200).json({
          status: 'success',
          statusCode: 200,
          message: 'Customer reactivated successfully',
          data: customer,
        });
      }
      return next(new AppError('Customer already active for this user.', 400));
    }

    // Create new customer, assigning the current user as owner
    customer = await Customer.create({
      email,
      phoneNumbers,
      fullname,
      ...otherData,
      owner: userId // Crucial: Assign owner during creation
    });

    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: customer,
    });
  }),
];

// --- 4. Get Customer by ID ---
exports.getCustomerById = catchAsync(async (req, res, next) => {
  const userId = req.user._id; // Get the authenticated user's ID
  const customerId = req.params.id;

  // Get the customer by ID AND owner, with up-to-date totals
  // Assuming `getUserWithTotals` is a static method on your Customer model
  let customer = await Customer.getUserWithTotals({ _id: customerId, owner: userId }); // Crucial: Filter by owner
  if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

  // Now update the remaining amount by subtracting completed payments
  customer = await Customer.updateRemainingAmount(customer._id); // Assuming this method implicitly uses the fetched customer's context or is smart enough
  if (!customer) return next(new AppError('Failed to update remaining amount', 500));

  // The role check is now less critical here because the query already filters by owner.
  // However, if an admin should be able to view ANY customer, you'd add a conditional here.
  // if (req.user.role !== 'admin' && req.user._id.toString() !== customer.owner.toString()) {
  //   return next(new AppError('You can only view your own customer profiles', 403));
  // }

  res.status(200).json({
    status: 'success',
    statusCode: 200,
    data: customer,
  });
});

// --- 5. Get All Customers (Per User) ---
// This assumes handleFactory.getAll can take a filter.
// If not, you'll need to modify handleFactory or write manual `getAll` here.
exports.getAllCustomer = handleFactory.getAll(Customer); // Crucial: Pass owner to filter

// --- 6. Update Customer (Per User) ---
// This assumes handleFactory.updateOne can take an owner filter implicitly.
// If handleFactory.updateOne doesn't support implicit owner filtering, you'd modify it.
exports.updateCustomer = handleFactory.updateOne(Customer); // handleFactory.updateOne must internally use { _id: req.params.id, owner: req.user._id }
// OR a custom implementation for `updateCustomer` like:
/*
exports.updateCustomer = catchAsync(async (req, res, next) => {
    const updatedDoc = await Customer.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id }, // Filter by ID AND owner
        req.body,
        { new: true, runValidators: true }
    );
    if (!updatedDoc) {
        return next(new AppError('No document found with that ID or you do not have permission', 404));
    }
    res.status(200).json({
        status: 'success',
        data: { data: updatedDoc },
    });
});
*/

// --- 7. Delete Customer (Per User) ---
// This assumes handleFactory.deleteOne can take an owner filter implicitly.
exports.deleteCustomer = handleFactory.deleteOne(Customer); // handleFactory.deleteOne must internally use { _id: req.params.id, owner: req.user._id }
// OR a custom implementation for `deleteCustomer` like:
/*
exports.deleteCustomer = catchAsync(async (req, res, next) => {
    const doc = await Customer.findOneAndDelete({ _id: req.params.id, owner: req.user._id }); // Filter by ID AND owner
    if (!doc) {
        return next(new AppError('No document found with that ID or you do not have permission', 404));
    }
    res.status(204).json({
        status: 'success',
        data: null,
    });
});
*/

// --- 8. Deactivate Multiple Customers (Per User) ---
exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
  const ids = req.body.ids;
  const userId = req.user._id; // Get the authenticated user's ID

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('No valid IDs provided for deactivation.', 400));
  }
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    return next(new AppError('No valid IDs provided.', 400));
  }

  // Update customers by IDs AND ensure they belong to the current user
  const result = await Customer.updateMany(
    { _id: { $in: validIds }, owner: userId }, // Crucial: Filter by owner
    { status: 'inactive' }
  );

  if (result.matchedCount === 0) {
    // If matchedCount is 0, it means no customers were found for *this user* with the provided IDs.
    return next(new AppError(`No customers found for your account with the provided IDs.`, 404));
  }

  res.status(200).json({
    status: 'success',
    statusCode: 200,
    message: `${result.modifiedCount} customers deactivated successfully.`,
  });
});
// const Customer = require('../Models/customerModel');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const { body, validationResult } = require('express-validator');
// const multer = require('multer');
// const { createClient } = require('@supabase/supabase-js');
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const handleFactory = require('./handleFactory')

// exports.uploadProfileImage = [
//   upload.single('profileImg'),
//   catchAsync(async (req, res, next) => {
//     const customerId = req.params.id;
//     const file = req.file;
//     if (!file) return next(new AppError('No file uploaded', 400));

//     const fileName = `${Date.now()}_${file.originalname}`;
//     const { error } = await supabase.storage
//       .from(process.env.SUPABASE_BUCKET)
//       .upload(fileName, file.buffer, { contentType: file.mimeType, upsert: true });
//     if (error) return next(new AppError('Failed to upload image', 500));
//     const { publicURL } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);
//     const customer = await Customer.findbyIdAndUpdate(customerId, { profileImg: publicURL }, { new: true });
//     if (!customer) return next(new AppError('Customer not found', 404));
//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       message: 'Profile image uploaded successfully',
//       data: { profileImg: publicURL },
//     });
//   }),
// ];

// exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
//   const phoneNumbers = req.body.phoneNumbers;
//   if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
//     return next(new AppError('Phone numbers must be an array', 400));
//   }
//   const numbersToCheck = phoneNumbers.map(item => item.number);
//   const existingCustomer = await Customer.findOne({
//     'phoneNumbers.number': { $in: numbersToCheck },
//   });
//   if (existingCustomer) {
//     return next(new AppError(`Customer with phone number ${numbersToCheck.join(', ')} already exists`, 400));
//   }
//   next();
// });

// exports.newCustomer = [
//   body('email').isEmail().withMessage('Invalid email'),
//   body('fullname').notEmpty().withMessage('Full name is required'),
//   body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
//   catchAsync(async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
//     }
//     const { email, phoneNumbers, fullname, ...otherData } = req.body;
//     let customer = await Customer.findOne({ email });
//     if (customer) {
//       if (customer.status === 'inactive') {
//         customer = await Customer.findByIdAndUpdate(
//           customer._id,
//           { status: 'active', phoneNumbers, fullname, ...otherData },
//           { new: true }
//         );
//         return res.status(200).json({
//           status: 'success',
//           statusCode: 200,
//           message: 'Customer reactivated successfully',
//           data: customer,
//         });
//       }
//       return next(new AppError('Customer already active', 400));
//     }
//     customer = await Customer.create({ email, phoneNumbers, fullname, ...otherData });
//     res.status(201).json({
//       status: 'success',
//       message: 'Customer created successfully',
//       data: customer,
//     });
//   }),
// ];

// exports.getCustomerById = catchAsync(async (req, res, next) => {
//   // Get the customer with up-to-date totals first
//   let customer = await Customer.getUserWithTotals({ _id: req.params.id });
//   if (!customer) return next(new AppError('Customer not found with this Id', 404));
//   // Now update the remaining amount by subtracting completed payments
//   customer = await Customer.updateRemainingAmount(customer._id);
//   if (!customer) return next(new AppError('Failed to update remaining amount', 500));
//   if (req.user.role !== 'admin' && req.user._id.toString() !== customer._id.toString()) {
//     return next(new AppError('You can only view your own profile', 403));
//   }
//   res.status(200).json({
//     status: 'success',
//     statusCode: 200,
//     data: customer,
//   });
// });

// // exports.getAllCustomer = catchAsync(async (req, res, next) => {
// //   const customers = await Customer.find(); // Fetch all customers using the standard method
// //   const customersWithTotals = await Promise.all(
// //     customers.map(async (customer) => {
// //       return await Customer.getUserWithTotals({ _id: customer._id });
// //     })
// //   );


// //   res.status(200).json({
// //     status: 'success',
// //     statusCode: 200,
// //     results: customersWithTotals.length, // Use the length of the updated array
// //     data: customersWithTotals, // Send the array with updated customer data
// //   });
// // });

// // exports.getAllCustomer = handleFactory.getAll(Customer, {
// //   afterEach: async (customer) => {
// //     return await Customer.getUserWithTotals({ _id: customer._id });
// //   }
// // });
// exports.getAllCustomer = handleFactory.getAll(Customer)
// exports.updateCustomer = handleFactory.updateOne(Customer);
// exports.deleteCustomer = handleFactory.deleteOne(Customer);

// exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
//   const ids = req.body.ids;
//   if (!ids || !Array.isArray(ids) || ids.length === 0) {
//     return next(new AppError('No valid IDs provided for deactivation.', 400));
//   }
//   const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
//   if (validIds.length === 0) {
//     return next(new AppError('No valid IDs provided.', 400));
//   }
//   const result = await Customer.updateMany(
//     { _id: { $in: validIds } },
//     { status: 'inactive' }
//   );
//   if (result.matchedCount === 0) {
//     return next(new AppError(`No customers found with the provided IDs.`, 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     statusCode: 200,
//     message: `${result.modifiedCount} customers deactivated successfully.`,
//   });
// });

// // exports.updateCustomer = catchAsync(async (req, res, next) => {
// //   const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
// //     new: true,
// //     runValidators: true,
// //   });
// //   if (!customer) return next(new AppError('Customer not found with Id', 404));
// //   res.status(201).json({
// //     status: 'success',
// //     statusCode:201,
// //     data: customer,
// //   });
// // });

// // exports.getAllCustomer = handleFactory.getAll(Customer);
// // // exports.getAllCustomer = catchAsync(async (req, res, next) => {
// // //   const customers = await Customer.find();
// // //   res.status(200).json({
// // //     status: 'success',
// // //     statusCode:200,
// // //     results: customers.length,
// // //     data: customers,
// // //   });
// // // });

// // exports.deleteCustomer = catchAsync(async (req, res, next) => {
// //   const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
// //   if (!customer) return next(new AppError('Customer not found with Id', 404));
// //   res.status(200).json({
// //     status: 'success',
// //     statusCode:200,
// //     message: 'Customer deleted successfully',
// //     data: null,
// //   });
// // });