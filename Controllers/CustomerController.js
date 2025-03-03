
// const user = await Customer.getUserWithTotals({ _id:req._id  });
// console.log(user);

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
const Customer = require('../Models/customerModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const storage = multer.memoryStorage();
const upload = multer({ storage });
const handleFactory = require('./handleFactory')

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
      statusCode: 200,
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
          statusCode: 200,
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

// exports.getCustomerById = handleFactory.getOne(Customer);
// In customerController.js
exports.getCustomerById = catchAsync(async (req, res, next) => {
  // Get the customer with up-to-date totals first
  let customer = await Customer.getUserWithTotals({ _id: req.params.id });
  if (!customer) return next(new AppError('Customer not found with this Id', 404));
  // Now update the remaining amount by subtracting completed payments
  customer = await Customer.updateRemainingAmount(customer._id);
  if (!customer) return next(new AppError('Failed to update remaining amount', 500));
  // Optionally, restrict access to own data for non-admin users
  if (req.user.role !== 'admin' && req.user._id.toString() !== customer._id.toString()) {
    return next(new AppError('You can only view your own profile', 403));
  }
  res.status(200).json({
    status: 'success',
    statusCode: 200,
    data: customer,
  });
});

exports.getAllCustomer = handleFactory.getAll(Customer);
// exports.getAllCustomer = catchAsync(async (req, res, next) => {
//   const customers = await Customer.find();
//   res.status(200).json({
//     status: 'success',
//     statusCode:200,
//     results: customers.length,
//     data: customers,
//   });
// });

exports.updateCustomer = handleFactory.updateOne(Customer);
// exports.updateCustomer = catchAsync(async (req, res, next) => {
//   const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!customer) return next(new AppError('Customer not found with Id', 404));
//   res.status(201).json({
//     status: 'success',
//     statusCode:201,
//     data: customer,
//   });
// });

exports.deleteCustomer = handleFactory.deleteOne(Customer);

// exports.deleteCustomer = catchAsync(async (req, res, next) => {
//   const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
//   if (!customer) return next(new AppError('Customer not found with Id', 404));
//   res.status(200).json({
//     status: 'success',
//     statusCode:200,
//     message: 'Customer deleted successfully',
//     data: null,
//   });
// });

exports.getCustomerDropdown = catchAsync(async (req, res, next) => {
  const customers = await Customer.find({ status: { $ne: 'inactive' } })
    .select('fullname _id email')
    .lean();
  res.status(200).json({
    status: 'success',
    statusCode: 200,
    results: customers.length,
    data: { customersdrop: customers },
  });
});

exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
  const ids = req.body.ids;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('No valid IDs provided for deactivation.', 400));
  }
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    return next(new AppError('No valid IDs provided.', 400));
  }
  const result = await Customer.updateMany(
    { _id: { $in: validIds } },
    { status: 'inactive' }
  );
  if (result.matchedCount === 0) {
    return next(new AppError(`No customers found with the provided IDs.`, 404));
  }
  res.status(200).json({
    status: 'success',
    statusCode: 200,
    message: `${result.modifiedCount} customers deactivated successfully.`,
  });
});

// CRUD operations using handleFactory
// exports.getAllCustomer = handleFactory.getAll(Customer);
// exports.getCustomerById = handleFactory.getOne(Customer);
// exports.newCustomer = handleFactory.newOne(Customer);
// exports.updateCustomer = handleFactory.updateOne(Customer);
// exports.deleteCustomer = handleFactory.deleteOne(Customer);
// exports.deleteMultipleCustomer = handleFactory.deleteMultipleProduct(Customer);

