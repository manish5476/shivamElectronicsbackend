// const { query } = require("express");
// const Payment = require("./../Models/paymentModel");
// const handleFactory = require("./handleFactory");

// exports.getAllPayment = handleFactory.getAll(Payment, { path: "reviews" });
// exports.getPaymentById = handleFactory.getOne(Payment, { path: "reviews" });
// exports.newPayment = handleFactory.newOne(Payment);
// exports.deletePayment = handleFactory.deleteOne(Payment);
// exports.updatePayment = handleFactory.updateOne(Payment);
// // exports.deleteMultiplePayment = handleFactory.deleteMultiplePayment(Payment)
const Payment = require('../Models/paymentModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');

exports.newPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
    }
    const payment = await Payment.create(req.body);
    res.status(201).json({
      status: 'success',
      data: payment,
    });
  }),
];

exports.getAllPayment = catchAsync(async (req, res, next) => {
  const payments = await Payment.find();
  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: payments,
  });
});

exports.getPaymentById = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found with Id', 404));
  res.status(200).json({
    status: 'success',
    data: payment,
  });
});

exports.updatePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!payment) return next(new AppError('Payment not found with Id', 404));
  res.status(201).json({
    status: 'success',
    data: payment,
  });
});

exports.deletePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) return next(new AppError('Payment not found with Id', 404));
  res.status(200).json({
    status: 'success',
    message: 'Payment deleted successfully',
    data: null,
  });
});