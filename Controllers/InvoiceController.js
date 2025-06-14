const Invoice = require('../Models/invoiceModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const { body, validationResult } = require('express-validator');
const handleFactory = require('./handleFactory')
exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
    const existingInvoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber });
    if (existingInvoice) {
        return next(new AppError(`Invoice with number ${req.body.invoiceNumber} already exists`, 400));
    }
    next();
});

const productSalesStatistics = async (startDate, endDate) => {
    try {
        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate),
                    },
                },
            },
            {
                $unwind: '$items',
            },
            {
                $group: {
                    _id: '$items.product',
                    totalQuantitySold: { $sum: '$items.quantity' },
                },
            },
            {
                $lookup: {
                    from: 'products', // Replace with your actual product collection name
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: '$productDetails',
            },
            {
                $project: {
                    _id: 0,
                    product: '$productDetails.title',
                    totalQuantitySold: 1,
                },
            },
            {
                $sort: { totalQuantitySold: -1 },
            },
        ]);

        return salesData;
    } catch (error) {
        console.error('Error generating product sales statistics:', error);
        throw error;
    }
};

exports.getProductSales = async (req, res, next) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return next(new AppError('Please provide startDate and endDate in the request body', 400));
    }

    try {
        const salesStats = await productSalesStatistics(startDate, endDate);
        res.status(200).json({
            status: 'success',
            data: {
                salesStatistics: salesStats,
            },
        });
    } catch (error) {
        return next(error); // Handle errors appropriately
    }
};
exports.getAllInvoice = handleFactory.getAll(Invoice);
exports.getInvoiceById = handleFactory.getOne(Invoice);
exports.newInvoice = handleFactory.newOne(Invoice);
exports.deleteInvoice = handleFactory.deleteOne(Invoice);
exports.updateInvoice = handleFactory.updateOne(Invoice);
// exports.newInvoice = handleFactory.newOne(Invoice);

// exports.newInvoice = [
//     body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
//     body('buyer').notEmpty().withMessage('Buyer is required'),
//     body('items').isArray().withMessage('Items must be an array'),
//     catchAsync(async (req, res, next) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));
//         }
//         const invoice = await Invoice.create(req.body);
//         res.status(201).json({
//             status: 'success',
//             data: invoice,
//         });
//     }),
// ];

// exports.getAllInvoice = catchAsync(async (req, res, next) => {
//     const invoices = await Invoice.find();
//     res.status(200).json({
//         status: 'success',
//         results: invoices.length,
//         data: invoices,
//     });
// });

// exports.getInvoiceById = catchAsync(async (req, res, next) => {
//     const invoice = await Invoice.findById(req.params.id);
//     if (!invoice) return next(new AppError('Invoice not found with Id', 404));
//     res.status(200).json({
//         status: 'success',
//         data: invoice,
//     });
// });

// exports.updateInvoice = catchAsync(async (req, res, next) => {
//     const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
//         new: true,
//         runValidators: true,
//     });
//     if (!invoice) return next(new AppError('Invoice not found with Id', 404));
//     res.status(201).json({
//         status: 'success',
//         data: invoice,
//     });
// });

// exports.deleteInvoice = catchAsync(async (req, res, next) => {
//     const invoice = await Invoice.findByIdAndDelete(req.params.id);
//     if (!invoice) return next(new AppError('Invoice not found with Id', 404));
//     res.status(200).json({
//         status: 'success',
//         message: 'Invoice deleted successfully',
//         data: null,
//     });
// });


// const { query } = require("express");
// const Invoice = require("./../Models/invoiceModel");
// const catchAsync = require("../Utils/catchAsyncModule");
// const AppError = require("../Utils/appError");
// const handleFactory = require("./handleFactory");
// const { Status } = require("git");

// exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
//     // console.log("Checking for duplicate with SKU:", req.body.sku);
//     const existingInvoice = await Invoice.findOne({ sku: req.body.invoiceNumber });
//     // console.log("Existing Invoice:", existingInvoice);
//     if (existingInvoice) {
//         return next(
//             new AppError(
//                 `Invoice with this name already exists: ${req.body.invoiceNumber}`,
//                 400
//             )
//         );
//     }
//     next();
// });
