const Customer = require('../Models/customerModel'); // Your Customer model
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator'); // For API validation
const multer = require('multer'); // For API file uploads
const { createClient } = require('@supabase/supabase-js'); // For Supabase integration
const mongoose = require('mongoose'); // Needed for ObjectId validation

// Factory handlers for common CRUD operations
const handleFactory = require('./handleFactory');
const ApiFeatures = require('../Utils/ApiFeatures'); // Import ApiFeatures

// Supabase setup (uncomment and configure if used)
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// const storage = multer.memoryStorage();
// const upload = multer({ storage });


// --- API Controller Functions (for Express routes) ---

// Assuming `uploadProfileImage` is an API-only function due to multer/supabase dependency
// exports.uploadProfileImage = [
//     upload.single('profileImg'),
//     catchAsync(async (req, res, next) => {
//         const customerId = req.params.id;
//         const file = req.file;
//         const userId = req.user._id; // Get the authenticated user's ID

//         if (!file) return next(new AppError('No file uploaded', 400));

//         const fileName = `${Date.now()}_${file.originalname}`;
//         const { error } = await supabase.storage
//             .from(process.env.SUPABASE_BUCKET)
//             .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
//         if (error) return next(new AppError('Failed to upload image', 500));

//         const { publicUrl } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);

//         const customer = await Customer.findOneAndUpdate(
//             { _id: customerId, owner: userId },
//             { profileImg: publicUrl },
//             { new: true }
//         );

//         if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

//         res.status(200).json({
//             status: 'success',
//             statusCode: 200,
//             message: 'Profile image uploaded successfully',
//             data: { profileImg: publicUrl },
//         });
//     }),
// ];

exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
    const phoneNumbers = req.body.phoneNumbers;
    const userId = req.user._id; // Get the authenticated user's ID
    const isSuperAdmin = req.user.role === 'superAdmin';

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return next(new AppError('Phone numbers must be an array', 400));
    }
    const numbersToCheck = phoneNumbers.map(item => item.number);

    let filter = { 'phoneNumbers.number': { $in: numbersToCheck } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const existingCustomer = await Customer.findOne(filter);

    if (existingCustomer) {
        return next(new AppError(`Customer with phone number(s) ${numbersToCheck.join(', ')} already exists for this user.`, 400));
    }
    next();
});

// Create New Customer API endpoint using factory handler and validation
exports.newCustomer = [
    body('email').isEmail().withMessage('Invalid email'),
    body('fullname').notEmpty().withMessage('Full name is required'),
    body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
    // Pre-validation to check for reactivation logic before factory handler creates
    catchAsync(async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
        }

        const { email } = req.body;
        const userId = req.user._id;
        const isSuperAdmin = req.user.role === 'superAdmin';

        let filter = { email };
        if (!isSuperAdmin) {
             filter.owner = userId; // Filter by owner unless superAdmin
        }

        let customer = await Customer.findOne(filter);

        if (customer) {
            if (customer.status === 'inactive') {
                req.params.id = customer._id; // Set ID for update factory
                req.body.status = 'active'; // Ensure status is set to active
                return handleFactory.update(Customer)(req, res, next); // Pass control to update
            }
            return next(new AppError('Customer already active for this user.', 400));
        }
        next(); // If no existing customer or not inactive, proceed to creation
    }),
    handleFactory.create(Customer), // Use factory handler for actual creation
];


// Get Customer by ID API endpoint using factory handler
exports.getCustomerById = handleFactory.getOne(Customer); // This now handles superAdmin logic

// Get All Customers API endpoint using factory handler
exports.getAllCustomer = handleFactory.getAll(Customer); // This now handles superAdmin logic

// Update Customer API endpoint using factory handler
exports.updateCustomer = handleFactory.update(Customer); // This now handles superAdmin logic

// Delete Customer API endpoint using factory handler
exports.deleteCustomer = handleFactory.delete(Customer); // This now handles superAdmin logic

// Deactivate Multiple Customers API endpoint
exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
    const ids = req.body.ids;
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(new AppError('No valid IDs provided for deactivation.', 400));
    }
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
        return next(new AppError('No valid IDs provided.', 400));
    }

    let filter = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const result = await Customer.updateMany(
        filter,
        { status: 'inactive' }
    );

    if (result.matchedCount === 0) {
        return next(new AppError(`No customers found for your account with the provided IDs.`, 404));
    }

    res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: `${result.modifiedCount} customers deactivated successfully.`,
    });
});

exports.getCustomersNearMe = catchAsync(async (req, res, next) => {
  const { lng, lat, distance } = req.query;

  if (!lng || !lat) {
    return next(new AppError('Please provide latitude and longitude in the query string.', 400));
  }

  const customers = await Customer.findNear(lng, lat, distance);

  res.status(200).json({
    status: 'success',
    results: customers.length,
    data: {
      customers
    }
  });
});


exports.createCustomerWithGeocoding = catchAsync(async (req, res, next) => {
    const customerData = req.body;

    // Check if there are addresses to geocode
    if (customerData.addresses && customerData.addresses.length > 0) {
        for (const address of customerData.addresses) {
            // Combine the address parts into a single string for geocoding
            const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
            
            const loc = await geocoder.geocode(addressString);
            
            // Add the location to the address object
            address.location = {
                type: 'Point',
                coordinates: [loc[0].longitude, loc[0].latitude]
            };
        }
    }

    // Assign the owner and create the customer
    customerData.owner = req.user._id;
    const customer = await Customer.create(customerData);

    res.status(201).json({
        status: 'success',
        data: {
            customer
        }
    });
});

// --- Bot-Specific Helper Functions (No req, res, next) ---
// These functions will be called directly by the Telegram bot handlers.

exports.newCustomerBot = async (customerData, userId) => {
    const { email, phoneNumbers, fullname, ...otherData } = customerData;

    if (!email || !fullname || !phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new AppError('Email, full name, and at least one phone number are required.', 400);
    }
    if (!phoneNumbers.every(p => p.number)) {
        throw new AppError('All phone numbers must have a "number" field.', 400);
    }

    // Check for existing customer for reactivation or duplication for this user
    let customer = await Customer.findOne({ email, owner: userId });

    if (customer) {
        if (customer.status === 'inactive') {
            customer = await Customer.findByIdAndUpdate(
                customer._id,
                { status: 'active', phoneNumbers, fullname, ...otherData },
                { new: true }
            );
            return { message: 'Customer reactivated successfully', customer };
        }
        throw new AppError('Customer already active for this user.', 400);
    }

    // Create new customer, assigning the current user as owner
    customer = await Customer.create({
        email,
        phoneNumbers,
        fullname,
        ...otherData,
        owner: userId
    });

    return { message: 'Customer created successfully', customer };
};

exports.getCustomerByIdBot = async (customerId, userId, isSuperAdmin = false) => {
    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    let customer = await Customer.getUserWithTotals(filter); // Use your specific method

    if (!customer) {
        throw new AppError(`Customer not found with ID ${customerId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }

    // This update is specific to your customer model logic
    customer = await Customer.updateRemainingAmount(customer._id);
    if (!customer) throw new AppError('Failed to update remaining amount for customer', 500);

    return customer;
};

exports.getAllCustomersBot = async (userId, isSuperAdmin = false, queryFilters = {}) => {
    let baseFilter = {};
    if (!isSuperAdmin) {
        baseFilter = { owner: userId };
    }

    const combinedFilter = {
        ...baseFilter,
        ...queryFilters, // Allow external query filters for the bot
    };

    const features = new ApiFeatures(Customer.find(), combinedFilter)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const customers = await features.query;
    return customers;
};

exports.updateCustomerBot = async (customerId, updateData, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError('Invalid customer ID.', 400);
    }

    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
        filter,
        updateData,
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedCustomer) {
        throw new AppError(`Customer not found with ID ${customerId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }
    return updatedCustomer;
};


exports.deleteCustomerBot = async (customerId, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError('Invalid customer ID.', 400);
    }

    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const deletedCustomer = await Customer.findOneAndDelete(filter);

    if (!deletedCustomer) {
        throw new AppError(`Customer not found with ID ${customerId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }
    return { message: 'Customer deleted successfully' };
};


exports.deactivateMultipleCustomersBot = async (customerIds, userId, isSuperAdmin = false) => {
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        throw new AppError('No valid IDs provided for deactivation.', 400);
    }
    const validIds = customerIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
        throw new AppError('No valid IDs provided.', 400);
    }

    let filter = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const result = await Customer.updateMany(
        filter,
        { status: 'inactive' }
    );

    if (result.matchedCount === 0) {
        throw new AppError(`No customers found for your account with the provided IDs.`, 404);
    }

    return { modifiedCount: result.modifiedCount, message: `${result.modifiedCount} customers deactivated successfully.` };
};

// const Customer = require('../Models/customerModel'); // Your modified Customer model
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const { body, validationResult } = require('express-validator');
// const multer = require('multer');
// const { createClient } = require('@supabase/supabase-js');
// // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const handleFactory = require('./handleFactory'); // Your generic factory handler

// // Make sure your routes for these handlers are protected by `authController.protect` middleware.
// // Example: router.get('/', protect, customerController.getAllCustomer);

// // --- 1. Upload Profile Image ---
// // exports.uploadProfileImage = [
// //   upload.single('profileImg'),
// //   catchAsync(async (req, res, next) => {
// //     const customerId = req.params.id;
// //     const file = req.file;
// //     const userId = req.user._id; // Get the authenticated user's ID

// //     if (!file) return next(new AppError('No file uploaded', 400));

// //     const fileName = `${Date.now()}_${file.originalname}`;
// //     const { error } = await supabase.storage
// //       .from(process.env.SUPABASE_BUCKET)
// //       .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true }); // Corrected mimeType to mimetype
// //     if (error) return next(new AppError('Failed to upload image', 500));

// //     const { publicUrl } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName); // Corrected publicURL to publicUrl

// //     // Find and update the customer by ID AND ensure it belongs to the current user
// //     const customer = await Customer.findOneAndUpdate(
// //       { _id: customerId, owner: userId }, // Crucial: Filter by owner
// //       { profileImg: publicUrl }, // Use publicUrl here
// //       { new: true }
// //     );

// //     if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: 'Profile image uploaded successfully',
// //       data: { profileImg: publicUrl },
// //     });
// //   }),
// // ];

// // --- 2. Find Duplicate Customer (Per User) ---
// exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
//   const phoneNumbers = req.body.phoneNumbers;
//   const userId = req.user._id; // Get the authenticated user's ID

//   if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
//     return next(new AppError('Phone numbers must be an array', 400));
//   }
//   const numbersToCheck = phoneNumbers.map(item => item.number);

//   // Find a duplicate customer by phone number AND ensure it belongs to the current user
//   const existingCustomer = await Customer.findOne({
//     owner: userId, // Crucial: Filter by owner
//     'phoneNumbers.number': { $in: numbersToCheck },
//   });

//   if (existingCustomer) {
//     return next(new AppError(`Customer with phone number(s) ${numbersToCheck.join(', ')} already exists for this user.`, 400));
//   }
//   next();
// });

// // --- 3. Create New Customer ---
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
//     const userId = req.user._id; // Get the authenticated user's ID

//     // Find customer by email AND owner to check for reactivation or duplication per user
//     let customer = await Customer.findOne({ email, owner: userId }); // Crucial: Filter by owner

//     if (customer) {
//       if (customer.status === 'inactive') {
//         // Reactivate customer belonging to the current user
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
//       return next(new AppError('Customer already active for this user.', 400));
//     }

//     // Create new customer, assigning the current user as owner
//     customer = await Customer.create({
//       email,
//       phoneNumbers,
//       fullname,
//       ...otherData,
//       owner: userId // Crucial: Assign owner during creation
//     });

//     res.status(201).json({
//       status: 'success',
//       message: 'Customer created successfully',
//       data: customer,
//     });
//   }),
// ];

// // --- 4. Get Customer by ID ---
// // exports.getCustomerById = catchAsync(async (req, res, next) => {
// //   const userId = req.user._id; // Get the authenticated user's ID
// //   const customerId = req.params.id;

// //   // Get the customer by ID AND owner, with up-to-date totals
// //   // Assuming `getUserWithTotals` is a static method on your Customer model
// //   let customer = await Customer.getUserWithTotals({ _id: customerId, owner: userId }); // Crucial: Filter by owner
// //   if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

// //   // Now update the remaining amount by subtracting completed payments
// //   customer = await Customer.updateRemainingAmount(customer._id); // Assuming this method implicitly uses the fetched customer's context or is smart enough
// //   if (!customer) return next(new AppError('Failed to update remaining amount', 500));

// //   // The role check is now less critical here because the query already filters by owner.
// //   // However, if an admin should be able to view ANY customer, you'd add a conditional here.
// //   // if (req.user.role !== 'admin' && req.user._id.toString() !== customer.owner.toString()) {
// //   //   return next(new AppError('You can only view your own customer profiles', 403));
// //   // }

// //   res.status(200).json({
// //     status: 'success',
// //     statusCode: 200,
// //     data: customer,
// //   });
// // });

// // --- 4. Get Customer by ID ---
// exports.getCustomerById = catchAsync(async (req, res, next) => {
//     const userId = req.user._id; // Get the authenticated user's ID
//     const customerId = req.params.id;
//     const isSuperAdmin = req.user.role === 'superAdmin';
//     let findFilter = { _id: customerId };
//     if (!isSuperAdmin) { 
//         findFilter.owner = userId; 
//     }

//     let customer = await Customer.getUserWithTotals(findFilter);

//     if (!customer) {
//         return next(new AppError(
//             `Customer not found with Id ${customerId}` +
//             (!isSuperAdmin ? ' or you do not have permission.' : '.'),
//             404
//         ));
//     }
    
//     console.log(customer,"kkkkkkkkkkkkkkkkkkkkkk");
//     customer = await Customer.updateRemainingAmount(customer._id);
//     if (!customer) return next(new AppError('Failed to update remaining amount', 500));

//     res.status(200).json({
//         status: 'success',
//         statusCode: 200,
//         data: customer,
//     });
// });


// // --- 5. Get All Customers (Per User) ---
// // This assumes handleFactory.getAll can take a filter.
// // If not, you'll need to modify handleFactory or write manual `getAll` here.
// exports.getAllCustomer = handleFactory.getAll(Customer); // Crucial: Pass owner to filter

// // --- 6. Update Customer (Per User) ---
// // This assumes handleFactory.update can take an owner filter implicitly.
// // If handleFactory.update doesn't support implicit owner filtering, you'd modify it.
// exports.updateCustomer = handleFactory.update(Customer); // handleFactory.update must internally use { _id: req.params.id, owner: req.user._id }
// // OR a custom implementation for `updateCustomer` like:
// /*
// exports.updateCustomer = catchAsync(async (req, res, next) => {
//     const updatedDoc = await Customer.findOneAndUpdate(
//         { _id: req.params.id, owner: req.user._id }, // Filter by ID AND owner
//         req.body,
//         { new: true, runValidators: true }
//     );
//     if (!updatedDoc) {
//         return next(new AppError('No document found with that ID or you do not have permission', 404));
//     }
//     res.status(200).json({
//         status: 'success',
//         data: { data: updatedDoc },
//     });
// });
// */

// // --- 7. Delete Customer (Per User) ---
// // This assumes handleFactory.delete can take an owner filter implicitly.
// exports.deleteCustomer = handleFactory.delete(Customer); // handleFactory.delete must internally use { _id: req.params.id, owner: req.user._id }
// // OR a custom implementation for `deleteCustomer` like:
// /*
// exports.deleteCustomer = catchAsync(async (req, res, next) => {
//     const doc = await Customer.findOneAndDelete({ _id: req.params.id, owner: req.user._id }); // Filter by ID AND owner
//     if (!doc) {
//         return next(new AppError('No document found with that ID or you do not have permission', 404));
//     }
//     res.status(204).json({
//         status: 'success',
//         data: null,
//     });
// });
// */

// // --- 8. Deactivate Multiple Customers (Per User) ---
// exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
//   const ids = req.body.ids;
//   const userId = req.user._id; // Get the authenticated user's ID

//   if (!ids || !Array.isArray(ids) || ids.length === 0) {
//     return next(new AppError('No valid IDs provided for deactivation.', 400));
//   }
//   const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
//   if (validIds.length === 0) {
//     return next(new AppError('No valid IDs provided.', 400));
//   }

//   // Update customers by IDs AND ensure they belong to the current user
//   const result = await Customer.updateMany(
//     { _id: { $in: validIds }, owner: userId }, // Crucial: Filter by owner
//     { status: 'inactive' }
//   );

//   if (result.matchedCount === 0) {
//     // If matchedCount is 0, it means no customers were found for *this user* with the provided IDs.
//     return next(new AppError(`No customers found for your account with the provided IDs.`, 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     statusCode: 200,
//     message: `${result.modifiedCount} customers deactivated successfully.`,
//   });
// });


// // const Customer = require('../Models/customerModel');
// // const catchAsync = require('../Utils/catchAsyncModule');
// // const AppError = require('../Utils/appError');
// // const { body, validationResult } = require('express-validator');
// // const multer = require('multer');
// // const { createClient } = require('@supabase/supabase-js');
// // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// // const storage = multer.memoryStorage();
// // const upload = multer({ storage });
// // const handleFactory = require('./handleFactory')

// // exports.uploadProfileImage = [
// //   upload.single('profileImg'),
// //   catchAsync(async (req, res, next) => {
// //     const customerId = req.params.id;
// //     const file = req.file;
// //     if (!file) return next(new AppError('No file uploaded', 400));

// //     const fileName = `${Date.now()}_${file.originalname}`;
// //     const { error } = await supabase.storage
// //       .from(process.env.SUPABASE_BUCKET)
// //       .upload(fileName, file.buffer, { contentType: file.mimeType, upsert: true });
// //     if (error) return next(new AppError('Failed to upload image', 500));
// //     const { publicURL } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);
// //     const customer = await Customer.findbyIdAndUpdate(customerId, { profileImg: publicURL }, { new: true });
// //     if (!customer) return next(new AppError('Customer not found', 404));
// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: 'Profile image uploaded successfully',
// //       data: { profileImg: publicURL },
// //     });
// //   }),
// // ];

// // exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
// //   const phoneNumbers = req.body.phoneNumbers;
// //   if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
// //     return next(new AppError('Phone numbers must be an array', 400));
// //   }
// //   const numbersToCheck = phoneNumbers.map(item => item.number);
// //   const existingCustomer = await Customer.findOne({
// //     'phoneNumbers.number': { $in: numbersToCheck },
// //   });
// //   if (existingCustomer) {
// //     return next(new AppError(`Customer with phone number ${numbersToCheck.join(', ')} already exists`, 400));
// //   }
// //   next();
// // });

// // exports.newCustomer = [
// //   body('email').isEmail().withMessage('Invalid email'),
// //   body('fullname').notEmpty().withMessage('Full name is required'),
// //   body('phoneNumbers.*.number').notEmpty().withMessage('Phone number is required'),
// //   catchAsync(async (req, res, next) => {
// //     const errors = validationResult(req);
// //     if (!errors.isEmpty()) {
// //       return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
// //     }
// //     const { email, phoneNumbers, fullname, ...otherData } = req.body;
// //     let customer = await Customer.findOne({ email });
// //     if (customer) {
// //       if (customer.status === 'inactive') {
// //         customer = await Customer.findByIdAndUpdate(
// //           customer._id,
// //           { status: 'active', phoneNumbers, fullname, ...otherData },
// //           { new: true }
// //         );
// //         return res.status(200).json({
// //           status: 'success',
// //           statusCode: 200,
// //           message: 'Customer reactivated successfully',
// //           data: customer,
// //         });
// //       }
// //       return next(new AppError('Customer already active', 400));
// //     }
// //     customer = await Customer.create({ email, phoneNumbers, fullname, ...otherData });
// //     res.status(201).json({
// //       status: 'success',
// //       message: 'Customer created successfully',
// //       data: customer,
// //     });
// //   }),
// // ];

// // exports.getCustomerById = catchAsync(async (req, res, next) => {
// //   // Get the customer with up-to-date totals first
// //   let customer = await Customer.getUserWithTotals({ _id: req.params.id });
// //   if (!customer) return next(new AppError('Customer not found with this Id', 404));
// //   // Now update the remaining amount by subtracting completed payments
// //   customer = await Customer.updateRemainingAmount(customer._id);
// //   if (!customer) return next(new AppError('Failed to update remaining amount', 500));
// //   if (req.user.role !== 'admin' && req.user._id.toString() !== customer._id.toString()) {
// //     return next(new AppError('You can only view your own profile', 403));
// //   }
// //   res.status(200).json({
// //     status: 'success',
// //     statusCode: 200,
// //     data: customer,
// //   });
// // });

// // // exports.getAllCustomer = catchAsync(async (req, res, next) => {
// // //   const customers = await Customer.find(); // Fetch all customers using the standard method
// // //   const customersWithTotals = await Promise.all(
// // //     customers.map(async (customer) => {
// // //       return await Customer.getUserWithTotals({ _id: customer._id });
// // //     })
// // //   );


// // //   res.status(200).json({
// // //     status: 'success',
// // //     statusCode: 200,
// // //     results: customersWithTotals.length, // Use the length of the updated array
// // //     data: customersWithTotals, // Send the array with updated customer data
// // //   });
// // // });

// // // exports.getAllCustomer = handleFactory.getAll(Customer, {
// // //   afterEach: async (customer) => {
// // //     return await Customer.getUserWithTotals({ _id: customer._id });
// // //   }
// // // });
// // exports.getAllCustomer = handleFactory.getAll(Customer)
// // exports.updateCustomer = handleFactory.update(Customer);
// // exports.deleteCustomer = handleFactory.delete(Customer);

// // exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
// //   const ids = req.body.ids;
// //   if (!ids || !Array.isArray(ids) || ids.length === 0) {
// //     return next(new AppError('No valid IDs provided for deactivation.', 400));
// //   }
// //   const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
// //   if (validIds.length === 0) {
// //     return next(new AppError('No valid IDs provided.', 400));
// //   }
// //   const result = await Customer.updateMany(
// //     { _id: { $in: validIds } },
// //     { status: 'inactive' }
// //   );
// //   if (result.matchedCount === 0) {
// //     return next(new AppError(`No customers found with the provided IDs.`, 404));
// //   }
// //   res.status(200).json({
// //     status: 'success',
// //     statusCode: 200,
// //     message: `${result.modifiedCount} customers deactivated successfully.`,
// //   });
// // });

// // // exports.updateCustomer = catchAsync(async (req, res, next) => {
// // //   const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
// // //     new: true,
// // //     runValidators: true,
// // //   });
// // //   if (!customer) return next(new AppError('Customer not found with Id', 404));
// // //   res.status(201).json({
// // //     status: 'success',
// // //     statusCode:201,
// // //     data: customer,
// // //   });
// // // });

// // // exports.getAllCustomer = handleFactory.getAll(Customer);
// // // // exports.getAllCustomer = catchAsync(async (req, res, next) => {
// // // //   const customers = await Customer.find();
// // // //   res.status(200).json({
// // // //     status: 'success',
// // // //     statusCode:200,
// // // //     results: customers.length,
// // // //     data: customers,
// // // //   });
// // // // });

// // // exports.deleteCustomer = catchAsync(async (req, res, next) => {
// // //   const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
// // //   if (!customer) return next(new AppError('Customer not found with Id', 404));
// // //   res.status(200).json({
// // //     status: 'success',
// // //     statusCode:200,
// // //     message: 'Customer deleted successfully',
// // //     data: null,
// // //   });
// // // });