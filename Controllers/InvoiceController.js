
const { query } = require("express");
const Invoice = require("./../Models/invoiceModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const handleFactory = require("./handleFactory");
const { Status } = require("git");



exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
    console.log("Checking for duplicate with SKU:", req.body.sku);
    const existingInvoice = await Invoice.findOne({ sku: req.body.sku });
    console.log("Existing Invoice:", existingInvoice);
    if (existingInvoice) {
        return next(
            new AppError(
                `Invoice with this name already exists: ${req.body.sku}`,
                400
            )
        );
    }
    next();
});


exports.getAllInvoice = handleFactory.getAll(Invoice);
exports.getInvoiceById = handleFactory.getOne(Invoice);
exports.newInvoice = handleFactory.newOne(Invoice);
exports.deleteInvoice = handleFactory.deleteOne(Invoice);
exports.updateInvoice = handleFactory.updateOne(Invoice);