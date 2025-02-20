const Customer = require('../Models/customerModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const storage = multer.memoryStorage();
const upload = multer({ storage });

// exports.uploadProfileImage = [
//   upload.single('profileImg'),
//   catchAsync(async (req, res, next) => {
//     const customerId = req.params.id;
//     const file = req.file;
//     if (!file) return next(new AppError('No file uploaded', 400));

//     const fileName = `${Date.now()}_${file.originalname}`;
//     const { error } = await supabase.storage
//       .from(process.env.SUPABASE_BUCKET)
//       .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

//     if (error) return next(new AppError('Failed to upload image', 500));

//     const { publicURL } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);
//     const customer = await Customer.findByIdAndUpdate(customerId, { profileImg: publicURL }, { new: true });

//     if (!customer) return next(new AppError('Customer not found', 404));

//     res.status(200).json({
//       status: 'success',
//       message: 'Profile image uploaded successfully',
//       data: { profileImg: publicURL },
//     });
//   }),
// ];

exports.uploadProfileImage = [
  upload.single('profileImg'),
  catchAsync(async (req, res, next) => {
    const customerId = req.params.id;
    const file = req.file;
    if (!file) return next(new AppError('No file uploaded', 400));

    const fileName = `${Date.now()}_${file.originalname}`;
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, { contentType: file.mimeType, upsert: true });

    if (error) return next(new AppError('Failed to upload image', 500));

    const { publicURL } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);
    const customer = await Customer.findbyIdAndUpdate(customerId, { profileImg: publicURL }, { new: true });

    if (!customer) return next(new AppError('Customer not found', 404));

    res.status(200).json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: { profileImg: publicURL },
    });
  }),
];

exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
  const phoneNumbers = req.body.phoneNumbers;
  if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
    return next(new AppError('Phone numbers must be an array', 400));
  }
  const numbersToCheck = phoneNumbers.map(item => item.number);
  const existingCustomer = await Customer.findOne({
    'phoneNumbers.number': { $in: numbersToCheck },
  });
  if (existingCustomer) {
    return next(new AppError(`Customer with phone number ${numbersToCheck.join(', ')} already exists`, 400));
  }
  next();
});

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
    let customer = await Customer.findOne({ email });

    if (customer) {
      if (customer.status === 'inactive') {
        customer = await Customer.findByIdAndUpdate(
          customer._id,
          { status: 'active', phoneNumbers, fullname, ...otherData },
          { new: true }
        );
        return res.status(200).json({
          status: 'success',
          message: 'Customer reactivated successfully',
          data: customer,
        });
      }
      return next(new AppError('Customer already active', 400));
    }

    customer = await Customer.create({ email, phoneNumbers, fullname, ...otherData });
    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: customer,
    });
  }),
];

exports.getCustomerById = catchAsync(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate({
      path: 'cart.items.productId',
      select: 'title finalPrice thumbnail description',
    })
    .populate({
      path: 'cart.items.invoiceIds',
      select: 'invoiceNumber totalAmount invoiceDate status',
    })
    .populate({
      path: 'paymentHistory',
      select: 'amount status createdAt transactionId',
    });

  if (!customer) return next(new AppError('Customer not found with Id', 404));

  // Restrict access to own data for non-admin users
  if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user._id.toString() !== customer._id.toString()) {
    return next(new AppError('You can only view your own profile', 403));
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// exports.getCustomerById = catchAsync(async (req, res, next) => {
//   const customer = await Customer.findById(req.params.id)
//     .populate({
//       path: 'cart.items.productId',
//       select: 'title finalPrice thumbnail description',
//     })
//     .populate({
//       path: 'cart.items.invoiceIds',
//       select: 'invoiceNumber totalAmount invoiceDate status',
//     })
//     .populate({
//       path: 'paymentHistory',
//       select: 'amount status createdAt transactionId',
//     });

//   if (!customer) return next(new AppError('Customer not found with Id', 404));

//   res.status(200).json({
//     status: 'success',
//     data: customer,
//   });
// });

exports.getAllCustomer = catchAsync(async (req, res, next) => {
  const customers = await Customer.find();
  res.status(200).json({
    status: 'success',
    results: customers.length,
    data: customers,
  });
});

exports.updateCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!customer) return next(new AppError('Customer not found with Id', 404));
  res.status(201).json({
    status: 'success',
    data: customer,
  });
});

exports.deleteCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
  if (!customer) return next(new AppError('Customer not found with Id', 404));
  res.status(200).json({
    status: 'success',
    message: 'Customer deleted successfully',
    data: null,
  });
});

exports.getCustomerDropdown = catchAsync(async (req, res, next) => {
  const customers = await Customer.find({ status: { $ne: 'inactive' } })
    .select('fullname _id email')
    .lean();
  res.status(200).json({
    status: 'success',
    results: customers.length,
    data: { customersdrop: customers },
  });
});
// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const cartItemSchema = new Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true
//   },
//   invoiceIds: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Invoice'
//   }],
// });

// const customerSchema = new Schema({
//   createdAt: { type: Date, required: true, default: Date.now },
//   updatedAt: { type: Date, required: true, default: Date.now },
//   status: {
//     type: String,
//     enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
//     default: 'pending',
//   },
//   profileImg: { type: String },
//   email: { type: String, unique: true, match: /.+\@.+\..+/, required: true },
//   fullname: { type: String, required: true },
//   phoneNumbers: [{
//     number: { type: String, required: true },
//     type: { type: String, enum: ['home', 'mobile', 'work'], required: true },
//     primary: { type: Boolean, default: false }
//   }],
//   addresses: [{
//     street: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     zipCode: { type: String, required: true },
//     country: { type: String, required: true },
//     type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], required: true },
//     isDefault: { type: Boolean, default: false }
//   }],
//   cart: {
//     items: { type: [cartItemSchema], default: [] }
//   },
//   guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
//   totalPurchasedAmount: { type: Number, default: 0 },
//   remainingAmount: { type: Number, default: 0 },
//   paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
//   metadata: { type: Map, of: Schema.Types.Mixed },
// }, { timestamps: true });

// // Indexes for performance
// customerSchema.index({ email: 1 }, { unique: true });
// customerSchema.index({ 'phoneNumbers.number': 1 });

// // Population hooks
// customerSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'cart.items.productId',
//     select: 'title finalPrice thumbnail description',
//   })
//     .populate({
//       path: 'cart.items.invoiceIds',
//       select: 'invoiceNumber totalAmount invoiceDate status',
//     })
//     .populate({
//       path: 'paymentHistory',
//       select: 'amount status createdAt transactionId',
//     });
//   next();
// });

// customerSchema.pre('findOne', function (next) {
//   this.populate({
//     path: 'cart.items.productId',
//     select: 'title finalPrice thumbnail description',
//   })
//     .populate({
//       path: 'cart.items.invoiceIds',
//       select: 'invoiceNumber totalAmount invoiceDate status',
//     })
//     .populate({
//       path: 'paymentHistory',
//       select: 'amount status createdAt transactionId',
//     });
//   next();
// });

// // Centralized totals update with transactions
// async function updateCustomerTotals(customerId) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const customer = await Customer.findById(customerId)
//       .populate('cart.items.invoiceIds')
//       .populate('paymentHistory')
//       .session(session);

//     if (!customer) throw new Error('Customer not found');

//     const totalPurchasedAmount = customer.cart.items.reduce((acc, item) => {
//       return acc + (item.invoiceIds || []).reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
//     }, 0);

//     const totalPaid = customer.paymentHistory.reduce((acc, payment) => {
//       return acc + (payment.status === 'completed' ? payment.amount : 0);
//     }, 0);

//     customer.totalPurchasedAmount = totalPurchasedAmount;
//     customer.remainingAmount = totalPurchasedAmount - totalPaid;

//     await customer.save({ session });
//     await session.commitTransaction();
//   } catch (error) {
//     await session.abortTransaction();
//     throw new mongoose.Error(`Failed to update customer totals: ${error.message}`);
//   } finally {
//     session.endSession();
//   }
// }

// // Hooks to trigger totals update
// customerSchema.post('save', async function (doc) {
//   await updateCustomerTotals(doc._id);
// });

// customerSchema.post('findOneAndUpdate', async function (doc) {
//   if (doc) await updateCustomerTotals(doc._id);
// });

// const Customer = mongoose.model('Customer', customerSchema);
// module.exports = Customer;
// // const Customer = require("./../Models/customerModel");
// // const catchAsync = require("../Utils/catchAsyncModule");
// // const AppError = require("../Utils/appError");
// // const handleFactory = require("./handleFactory");

// // const multer = require('multer');
// // const { createClient } = require('@supabase/supabase-js');
// // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// // const storage = multer.memoryStorage();
// // exports.upload = multer({ storage });

// // // exports.uploadProfileImage = async (req, res) => {
// // //     try {
// // //         const customerId = req.params.id;
// // //         const file = req.file;
// // //         if (!file) {
// // //             return res.status(400).json({ message: 'No file uploaded.' });
// // //         }
// // //         const fileName = `${Date.now()}_${file.originalname}`;
// // //         const { data, error } = await supabase.storage
// // //             .from(process.env.SUPABASE_BUCKET)
// // //             .upload(fileName, file.buffer, {
// // //                 contentType: file.mimetype,
// // //                 upsert: true,  
// // //             });

// // //         if (error) {
// // //             console.error('Supabase Upload Error:', error);
// // //             return res.status(500).json({ error: 'Failed to upload image.' });
// // //         }
// // //         const { publicURL } = supabase.storage
// // //             .from(process.env.SUPABASE_BUCKET)
// // //             .getPublicUrl(fileName);

// // //             const customer = await Customer.findByIdAndUpdate(
// // //             customerId,
// // //             { profileImg: publicURL },
// // //             { new: true }
// // //         );

// // //         if (!customer) {
// // //             return res.status(404).json({ message: 'Customer not found.' });
// // //         }

// // //         res.status(200).json({
// // //             message: 'Profile image uploaded successfully.',
// // //             profileImg: publicURL,
// // //         });
// // //     } catch (error) {
// // //         console.error('Upload Error:', error);
// // //         res.status(500).json({ error: 'Internal Server Error' });
// // //     }
// // // };
// // exports.uploadProfileImage = async (req, res) => {
// //   try {
// //       const customerId = req.params.id;   // Get customer ID from the route
// //       const file = req.file;              // Get the uploaded file

// //       if (!file) {
// //           return res.status(400).json({ message: 'No file uploaded.' });
// //       }

// //       // Generate a unique file name using the current timestamp
// //       const fileName = `${Date.now()}_${file.originalname}`;

// //       // Upload the file to Supabase storage
// //       const { data, error } = await supabase.storage
// //           .from(process.env.SUPABASE_BUCKET)
// //           .upload(fileName, file.buffer, {
// //               contentType: file.mimetype,
// //               upsert: true,  // Allow overwriting the file if it already exists
// //           });

// //       if (error) {
// //           console.error('Supabase Upload Error:', error);
// //           return res.status(500).json({ error: 'Failed to upload image.' });
// //       }

// //       // Retrieve the public URL of the uploaded image
// //       const { publicURL } = supabase.storage
// //           .from(process.env.SUPABASE_BUCKET)
// //           .getPublicUrl(fileName);

// //       // Update the customer document with the new profile image URL
// //       const customer = await Customer.findByIdAndUpdate(
// //           customerId,
// //           { profileImg: publicURL },   // Update the profile image field
// //           { new: true }                 // Return the updated customer document
// //       );

// //       if (!customer) {
// //           return res.status(404).json({ message: 'Customer not found.' });
// //       }

// //       // Send the updated customer details and success message in the response
// //       res.status(200).json({
// //           message: 'Profile image uploaded successfully.',
// //           profileImg: publicURL,  // Send the URL of the uploaded image
// //       });
// //   } catch (error) {
// //       console.error('Upload Error:', error);
// //       res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // };

// // exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
// //     const phoneNumbers = req.body.phoneNumbers;
// //     if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
// //       return next(new AppError("Phone numbers are required to check for duplicates.", 400));
// //     }
// //       const numbersToCheck = phoneNumbers.map((item) => item.number);
  
// //     const existingCustomer = await Customer.findOne({
// //       phoneNumbers: { $elemMatch: { number: { $in: numbersToCheck } } },
// //     });
  
// //     // If a match is found, return an error
// //     if (existingCustomer) {
// //       return next(
// //         new AppError(
// //           `Customer with one of these phone numbers already exists: ${numbersToCheck.join(", ")}`,
// //           400
// //         )
// //       );
// //     }
// //     next();
// //   });

// // //   exports.deleteCustomer = catchAsync(async (req, res, next) => {
// // //     await Customer.findByIdAndUpdate(
// // //         req.params.id, 
// // //         { status: "inactive" },  // Use "inactive" as a string
// // //         { new: true }  // Optional: Returns the updated document
// // //     );

// // //     res.status(204).json({
// // //         message: 'Customer deleted successfully.',
// // //         status: "success",
// // //         data: null,  // Change "null" (string) to null (actual value)
// // //     });
// // //     next();
// // // });

// // exports.deleteCustomer = catchAsync(async (req, res, next) => {
// //     const doc = await Customer.findByIdAndUpdate(req.params.id,
// //               { status: "inactive" }, 
// //               { new: true } );
// //     if (!doc) {
// //       return next(new AppError(`${Customer} not found with Id`, 404));
// //     }
// //     res.status(200).json({
// //       status: "success",
// //       messages: `Customer deleted successfully`,
// //       data: null,
// //     });
// //   });


  
// //   // Update customer status to inactive if they try to create again
// //   exports.newCustomer = catchAsync(async (req, res, next) => {
// //       const { email, phoneNumbers, fullname, ...otherData } = req.body;
  
// //       // Check if a customer with the same email exists
// //       let existingCustomer = await Customer.findOne({ email: email });
  
// //       if (existingCustomer) {
// //           // If the customer is inactive, reactivate them
// //           if (existingCustomer.status === 'inactive') {
// //               const updatedCustomer = await Customer.findByIdAndUpdate(
// //                   existingCustomer._id,
// //                   { 
// //                       status: 'active', 
// //                       phoneNumbers: phoneNumbers,  // Optionally, update the phone numbers
// //                       fullname: fullname,  // Optionally, update the fullname
// //                       ...otherData  // Any other updates needed
// //                   },
// //                   { new: true }  // Return the updated document
// //               );
  
// //               if (!updatedCustomer) {
// //                   return next(new AppError('Failed to reactivate the customer', 500));
// //               }
  
// //               return res.status(200).json({
// //                   status: 'success',
// //                   message: 'Customer reactivated successfully',
// //                   data: updatedCustomer,
// //               });
// //           } else {
// //               return next(new AppError('Customer is already active', 400));
// //           }
// //       } else {
// //           // If no existing customer, create a new one
// //           const newCustomer = new Customer({
// //               email,
// //               phoneNumbers,
// //               fullname,
// //               ...otherData
// //           });
  
// //           await newCustomer.save();
  
// //           res.status(201).json({
// //               status: 'success',
// //               message: 'Customer created successfully',
// //               data: newCustomer,
// //           });
// //       }
// //   });
// // exports.getCustomerById = catchAsync(async (req, res, next) => {
// //   const customer = await Customer.findById(req.params.id)
// //     .populate({
// //       path: 'cart.items.productId',
// //       select: 'title finalPrice thumbnail description',
// //     })
// //     .populate({
// //       path: 'cart.items.invoiceIds',
// //       select: 'invoiceNumber totalAmount invoiceDate status',
// //     })
// //     .populate({
// //       path: 'paymentHistory',
// //       select: 'amount status createdAt transactionId',
// //     });

// //   console.log('Populated Customer:', JSON.stringify(customer, null, 2)); // Debug log

// //   if (!customer) {
// //     return next(new AppError('Customer not found with Id', 404));
// //   }

// //   res.status(200).json({
// //     status: 'success',
// //     data: customer,
// //   });
// // });

// // exports.getCustomerByuniqueID = catchAsync(async (req, res, next) => {
// //   try {
// //     const customer = await Customer.findById(req.params.id)
// //       .populate({
// //         path: 'cart.items.productId',
// //         select: 'title finalPrice thumbnail description',
// //       })
// //       .populate({
// //         path: 'cart.items.invoiceIds',
// //         select: 'invoiceNumber totalAmount invoiceDate status',
// //       })
// //       .populate({
// //         path: 'paymentHistory',
// //         select: 'amount status createdAt transactionId',
// //       });

// //     if (!customer) {
// //       return next(new AppError('Customer not found with Id', 404));
// //     }

// //     res.status(200).json({
// //       status: 'success',
// //       data: customer,
// //     });
// //   } catch (error) {
// //     return next(new AppError(`Population error: ${error.message}`, 500));
// //   }
// // });
// // // exports.getCustomerById = catchAsync(async (req, res, next) => {
// // //   const customer = await Customer.findById(req.params.id)
// // //     .populate({
// // //       path: 'cart.items.productId',
// // //       select: 'title finalPrice thumbnail description',
// // //     })
// // //     .populate({
// // //       path: 'cart.items.invoiceIds',
// // //       select: 'invoiceNumber totalAmount invoiceDate status',
// // //     })
// // //     .populate({
// // //       path: 'paymentHistory',
// // //       select: 'amount status createdAt transactionId',
// // //     });

// // //   if (!customer) {
// // //     return next(new AppError('Customer not found with Id', 404));
// // //   }

// // //   res.status(200).json({
// // //     status: 'success',
// // //     data: customer,
// // //   });
// // // });
  
// //   // CRUD operations using handleFactory
// // exports.getAllCustomer = handleFactory.getAll(Customer);
// // // exports.getCustomerById = handleFactory.getOne(Customer);
// // // exports.newCustomer = handleFactory.newOne(Customer);
// // exports.updateCustomer = handleFactory.updateOne(Customer);
// // // exports.deleteCustomer = handleFactory.deleteOne(Customer);
// // exports.deleteMultipleCustomer = handleFactory.deleteMultipleProduct(Customer);

// // // const { query } = require("express");
// // // const Customer = require("./../Models/customerModel");
// // // const catchAsync = require("../Utils/catchAsyncModule");
// // // const AppError = require("../Utils/appError");
// // // // const reviewRoutes = require('../routes/reviewRoutes');  // Import reviewRoutes
// // // const handleFactory = require("./handleFactory");
// // // const { Status } = require("git");


// // // exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
// // //     if (!req.body.phone) {
// // //       return next(new AppError("Phone number is required to check for duplicates.", 400));
// // //     }
  
// // //     const existingCustomer = await Customer.findOne({ phone: req.body.phone });
// // //     if (existingCustomer) {
// // //       return next(
// // //         new AppError(
// // //           `Customer with this phone number already exists: ${req.body.phone}`,
// // //           400
// // //         )
// // //       );
// // //     }
  
// // //     next();
// // //   });
  


// // // // exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
// // // //     // console.log("Checking for duplicate with SKU:", req.body.sku);
// // // //     const existingCustomer = await Customer.findOne({ sku: req.body.sku });
// // // //     // console.log("Existing Customer:", existingCustomer);
// // // //     if (existingCustomer) {
// // // //         return next(
// // // //             new AppError(
// // // //                 `Customer with this name already exists: ${req.body.sku}`,
// // // //                 400
// // // //             )
// // // //         );
// // // //     }
// // // // });

// // // exports.deleteMultipleCustomer = handleFactory.deleteMultipleProduct(Customer)
// // // exports.getAllCustomer = handleFactory.getAll(Customer);
// // // exports.getCustomerById = handleFactory.getOne(Customer);
// // // exports.newCustomer = handleFactory.newOne(Customer);
// // // exports.deleteCustomer = handleFactory.deleteOne(Customer);
// // // exports.updateCustomer = handleFactory.updateOne(Customer);