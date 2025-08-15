
const handleFactory = require("./handleFactory");
const Payment = require('../Models/paymentModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');
const ApiFeatures = require('../Utils/ApiFeatures'); // Import ApiFeatures
const mongoose = require('mongoose'); // Import mongoose

exports.getAllPayment = handleFactory.getAll(Payment, { path: "reviews" });
exports.getPaymentById = handleFactory.getOne(Payment, { path: "reviews" });
exports.newPayment = handleFactory.create(Payment);
exports.deletePayment = handleFactory.delete(Payment);
exports.updatePayment = handleFactory.update(Payment);


exports.newPaymentBot = async (paymentData, userId) => {
  // Basic validation (you might want more detailed validation here)
  if (!paymentData.amount || !paymentData.customer || !paymentData.date) {
    throw new AppError('Amount, customer ID, and date are required for payment.', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(paymentData.customer)) {
    throw new AppError('Invalid customer ID.', 400);
  }

  // Assign owner from the bot user
  const payment = await Payment.create({
    ...paymentData,
    owner: userId // Assign the bot user as owner
  });

  if (!payment) {
    throw new AppError('Failed to create payment.', 500);
  }
  return { message: 'Payment created successfully', payment };
};

// exports.getPaymentByIdBot = async (paymentId, userId, isSuperAdmin = false, populateOptions = {}) => {
//   if (!mongoose.Types.ObjectId.isValid(paymentId)) {
//     throw new AppError('Invalid payment ID.', 400);
//   }

//   let filter = { _id: paymentId };
//   if (!isSuperAdmin) {
//     filter.owner = userId;
//   }

//   let query = Payment.findOne(filter);
//   if (populateOptions) {
//     query = query.populate(populateOptions);
//   }

//   const payment = await query;
//   if (!payment) {
//     throw new AppError(`Payment not found with ID ${paymentId}` +
//       (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
//   }
//   return payment;
// };

// exports.getAllPaymentsBot = async (userId, isSuperAdmin = false, queryFilters = {}, populateOptions = {}) => {
//   let baseFilter = {};
//   if (!isSuperAdmin) {
//     baseFilter = { owner: userId };
//   }

//   const combinedFilter = {
//     ...baseFilter,
//     ...queryFilters,
//   };

//   let query = Payment.find();
//   if (populateOptions) {
//     query = query.populate(populateOptions);
//   }

//   const features = new ApiFeatures(query, combinedFilter) // ApiFeatures will apply combinedFilter
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const payments = await features.query;
//   return payments;
// };


exports.getPaymentByIdBot = async (paymentId, userId, isSuperAdmin = false, populateOptions = { path: 'customerId', select: 'fullname email' }) => { // Corrected default populate path
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Invalid payment ID.', 400);
  }

  let filter = { _id: paymentId };
  if (!isSuperAdmin) {
    filter.owner = userId;
  }

  let query = Payment.findOne(filter);
  if (populateOptions) {
    query = query.populate(populateOptions);
  }

  const payment = await query;
  if (!payment) {
    throw new AppError(`Payment not found with ID ${paymentId}` +
      (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
  }
  return payment;
};

exports.getAllPaymentsBot = async (userId, isSuperAdmin = false, queryFilters = {}, populateOptions = { path: 'customerId', select: 'fullname email' }) => { // Corrected default populate path
  let baseFilter = {};
  if (!isSuperAdmin) {
    baseFilter = { owner: userId };
  }

  const combinedFilter = {
    ...baseFilter,
    ...queryFilters,
  };

  let query = Payment.find();
  if (populateOptions) {
    query = query.populate(populateOptions);
  }

  const features = new ApiFeatures(query, combinedFilter)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const payments = await features.query;
  return payments;
};

exports.updatePaymentBot = async (paymentId, updateData, userId, isSuperAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Invalid payment ID.', 400);
  }

  let filter = { _id: paymentId };
  if (!isSuperAdmin) {
    filter.owner = userId;
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    filter,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedPayment) {
    throw new AppError(`Payment not found with ID ${paymentId}` +
      (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
  }
  return updatedPayment;
};

exports.deletePaymentBot = async (paymentId, userId, isSuperAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Invalid payment ID.', 400);
  }

  let filter = { _id: paymentId };
  if (!isSuperAdmin) {
    filter.owner = userId;
  }

  const deletedPayment = await Payment.findOneAndDelete(filter);

  if (!deletedPayment) {
    throw new AppError(`Payment not found with ID ${paymentId}` +
      (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
  }
  return { message: 'Payment deleted successfully' };
};

// If you need deleteMultiplePayment for bot, you can create a specific one like:
exports.deleteMultiplePaymentsBot = async (paymentIds, userId, isSuperAdmin = false) => {
  if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
    throw new AppError('No valid IDs provided for deletion.', 400);
  }
  const validIds = paymentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new AppError('No valid IDs provided.', 400);
  }

  let filter = { _id: { $in: validIds } };
  if (!isSuperAdmin) {
    filter.owner = userId; // Filter by owner unless superAdmin
  }

  const result = await Payment.deleteMany(filter);

  if (result.deletedCount === 0) {
    throw new AppError(`No payments found with the provided IDs` +
      (!isSuperAdmin ? ' for your account.' : '.'), 404);
  }

  return { deletedCount: result.deletedCount, message: `${result.deletedCount} payments deleted successfully.` };
};

// exports.newPayment = [
//   body('amount').isNumeric().withMessage('Amount must be a number'),
//   body('customerId').notEmpty().withMessage('Customer ID is required'),
//   catchAsync(async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
//     }
//     const payment = await Payment.create(req.body);
//     res.status(201).json({
//       status: 'success',
//       data: payment,
//     });
//   }),
// ];

// exports.getAllPayment = catchAsync(async (req, res, next) => {
//   const payments = await Payment.find();
//   res.status(200).json({
//     status: 'success',
//     results: payments.length,
//     data: payments,
//   });
// });

// exports.getPaymentById = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findById(req.params.id);
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(200).json({
//     status: 'success',
//     data: payment,
//   });
// });

// exports.updatePayment = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(201).json({
//     status: 'success',
//     data: payment,
//   });
// });

// exports.deletePayment = catchAsync(async (req, res, next) => {
//   const payment = await Payment.findByIdAndDelete(req.params.id);
//   if (!payment) return next(new AppError('Payment not found with Id', 404));
//   res.status(200).json({
//     status: 'success',
//     message: 'Payment deleted successfully',
//     data: null,
//   });
// });