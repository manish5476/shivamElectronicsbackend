const { query } = require("express");
const Payment = require("./../Models/paymentModel");
const handleFactory = require("./handleFactory");

exports.getAllPayment = handleFactory.getAll(Payment, { path: "reviews" });
exports.getPaymentById = handleFactory.getOne(Payment, { path: "reviews" });
exports.newPayment = handleFactory.newOne(Payment);
exports.deletePayment = handleFactory.deleteOne(Payment);
exports.updatePayment = handleFactory.updateOne(Payment);
// exports.deleteMultiplePayment = handleFactory.deleteMultiplePayment(Payment)