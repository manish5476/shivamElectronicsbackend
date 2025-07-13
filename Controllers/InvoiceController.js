const Invoice = require('../Models/invoiceModel'); // Assuming your Invoice model is named invoiceModel.js
const Customer = require('../Models/customerModel'); // Assuming your Customer model is named customerModel.js
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsyncModule');
const handleFactory = require('./handleFactory'); // Your generic factory handler
const mongoose = require('mongoose'); // For ObjectId validation
const { body, validationResult } = require('express-validator'); // Still imported, even if not directly used by all handlers

const ApiFeatures = require('../Utils/ApiFeatures'); // Import ApiFeatures

// Middleware to find duplicate invoices by invoiceNumber
exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
    // Ensure the invoiceNumber is provided in the request body
    if (!req.body.invoiceNumber) {
        return next(new AppError('Invoice number is required to check for duplicates.', 400));
    }

    // Find a duplicate invoice by invoiceNumber (assuming invoiceNumber is unique globally, not per owner)
    const existingInvoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber });
    if (existingInvoice) {
        return next(new AppError(`Invoice with number ${req.body.invoiceNumber} already exists`, 400));
    }
    next(); // No duplicate found, proceed to the next middleware/handler
});

// Using handleFactory for basic CRUD operations (without explicit populate options here)
exports.getAllInvoice = handleFactory.getAll(Invoice);
exports.getInvoiceById = handleFactory.getOne(Invoice);
exports.newInvoice = handleFactory.newOne(Invoice);
exports.deleteInvoice = handleFactory.deleteOne(Invoice);
exports.updateInvoice = handleFactory.updateOne(Invoice);

// Custom API handler for creating an invoice (as it has specific logic like customer lookup)
exports.createInvoice = catchAsync(async (req, res, next) => {
    const { customerId, customerName, amount, status, products } = req.body;

    // Validate customerId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return next(new AppError('Invalid customer ID provided.', 400));
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
        return next(new AppError('Customer not found for the provided customerId', 400));
    }

    // Ensure products array is correctly formatted if coming from API
    let productsArray = products;
    if (!Array.isArray(products)) {
        // If products is not an array, assume single product from simplified bot input format
        // This part might need adjustment based on your API's expected product input
        if (req.body.productName && req.body.productQuantity && req.body.productPrice) {
            productsArray = [{
                productName: req.body.productName,
                quantity: parseInt(req.body.productQuantity, 10),
                price: parseFloat(req.body.productPrice)
            }];
        } else {
            return next(new AppError('Products array is required or missing product details.', 400));
        }
    }

    const newInv = await Invoice.create({
        customerId,
        customerName: customerName || customer.fullname, // Use provided name or fetched customer's name
        amount: parseFloat(amount),
        status: status || 'pending',
        products: productsArray,
        owner: req.user._id // Assign owner from authenticated user
    });

    res.status(201).json({
        status: 'success',
        statusCode: 201,
        data: newInv,
    });
});

// Helper function for product sales statistics (used by API and bot)
const productSalesStatistics = async (startDate, endDate, userId, isSuperAdmin) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format. Please use YYYY-MM-DD.', 400);
    }

    let matchFilter = {
        invoiceDate: { $gte: start, $lte: end },
        status: 'paid' // Only consider paid invoices for sales
    };

    if (!isSuperAdmin) {
        matchFilter.owner = userId; // Filter by owner if not super admin
    }

    try {
        const salesData = await Invoice.aggregate([
            {
                $match: matchFilter
            },
            {
                $unwind: '$products' // Deconstruct the products array
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }, // Sum product-wise sales
                    invoicesCount: { $addToSet: '$_id' }, // Count unique invoices
                    productSales: {
                        $push: {
                            name: '$products.productName',
                            quantity: '$products.quantity',
                            price: '$products.price'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalSales: 1,
                    invoicesCount: { $size: '$invoicesCount' },
                    productSales: {
                        $reduce: {
                            input: '$productSales',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $cond: {
                                            if: { $ne: ['$$this.name', null] },
                                            then: {
                                                $arrayToObject: [[
                                                    { k: '$$this.name', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.name', input: '$$value' } }, 0] }, { $multiply: ['$$this.quantity', '$$this.price'] }] } }
                                                ]]
                                            },
                                            else: {}
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        return salesData.length > 0 ? salesData[0] : { totalSales: 0, invoicesCount: 0, productSales: {} };
    } catch (error) {
        console.error('Error generating product sales statistics:', error);
        throw error; // Re-throw to be caught by catchAsync or bot handler
    }
};

// API handler for product sales
exports.getProductSales = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query; // Changed from req.body to req.query for API consistency
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    const salesStats = await productSalesStatistics(startDate, endDate, userId, isSuperAdmin);

    res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: {
            salesData: salesStats,
        },
    });
});


// --- Bot-Specific Helper Functions (No req, res, next) ---
// These functions are designed to be called directly by the Telegram bot handlers.

exports.getInvoiceByIdBot = async (invoiceId, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError('Invalid invoice ID.', 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const invoice = await Invoice.findOne(filter).populate('customerId', 'fullname email mobileNumber');
    if (!invoice) {
        throw new AppError(`No invoice found with ID ${invoiceId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }
    return invoice;
};

exports.getAllInvoicesBot = async (userId, isSuperAdmin = false) => {
    let filter = {};
    if (!isSuperAdmin) {
        filter.owner = userId;
    }
    const invoices = await Invoice.find(filter).populate('customerId', 'fullname email mobileNumber');
    return invoices;
};

exports.newInvoiceBot = async (invoiceData, userId) => {
    const { customerId, customerName, amount, status, productName, productQuantity, productPrice } = invoiceData;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError('Invalid customer ID provided.', 400);
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new AppError('Customer not found for the provided customerId', 400);
    }

    const productsArray = [{
        productName,
        quantity: parseInt(productQuantity, 10),
        price: parseFloat(productPrice)
    }];

    const newInv = await Invoice.create({
        customerId,
        customerName: customerName || customer.fullname,
        amount: parseFloat(amount),
        status: status || 'pending',
        products: productsArray,
        owner: userId // Assign owner from bot user
    });
    return newInv;
};

exports.updateInvoiceBot = async (invoiceId, updateData, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError('Invalid invoice ID.', 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const updatedInv = await Invoice.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true
    });
    if (!updatedInv) {
        throw new AppError(`No invoice found with ID ${invoiceId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }
    return updatedInv;
};

exports.deleteInvoiceBot = async (invoiceId, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError('Invalid invoice ID.', 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const invoice = await Invoice.findOneAndDelete(filter);
    if (!invoice) {
        throw new AppError(`No invoice found with ID ${invoiceId}` +
            (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404);
    }
    return { message: 'Invoice deleted successfully' };
};

exports.getProductSalesBot = async (startDate, endDate, userId, isSuperAdmin = false) => {
    // This bot function now directly calls the shared productSalesStatistics helper
    return await productSalesStatistics(startDate, endDate, userId, isSuperAdmin);
};
// const Invoice = require('../Models/invoiceModel');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const { body, validationResult } = require('express-validator');
// const handleFactory = require('./handleFactory')
// exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
//     const existingInvoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber });
//     if (existingInvoice) {
//         return next(new AppError(`Invoice with number ${req.body.invoiceNumber} already exists`, 400));
//     }
//     next();
// });

// const productSalesStatistics = async (startDate, endDate) => {
//     try {
//         const salesData = await Invoice.aggregate([
//             {
//                 $match: {
//                     invoiceDate: {
//                         $gte: new Date(startDate),
//                         $lte: new Date(endDate),
//                     },
//                 },
//             },
//             {
//                 $unwind: '$items',
//             },
//             {
//                 $group: {
//                     _id: '$items.product',
//                     totalQuantitySold: { $sum: '$items.quantity' },
//                 },
//             },
//             {
//                 $lookup: {
//                     from: 'products', // Replace with your actual product collection name
//                     localField: '_id',
//                     foreignField: '_id',
//                     as: 'productDetails',
//                 },
//             },
//             {
//                 $unwind: '$productDetails',
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     product: '$productDetails.title',
//                     totalQuantitySold: 1,
//                 },
//             },
//             {
//                 $sort: { totalQuantitySold: -1 },
//             },
//         ]);

//         return salesData;
//     } catch (error) {
//         console.error('Error generating product sales statistics:', error);
//         throw error;
//     }
// };

// exports.getProductSales = async (req, res, next) => {
//     const { startDate, endDate } = req.body;

//     if (!startDate || !endDate) {
//         return next(new AppError('Please provide startDate and endDate in the request body', 400));
//     }

//     try {
//         const salesStats = await productSalesStatistics(startDate, endDate);
//         res.status(200).json({
//             status: 'success',
//             data: {
//                 salesStatistics: salesStats,
//             },
//         });
//     } catch (error) {
//         return next(error); // Handle errors appropriately
//     }
// };
// exports.getAllInvoice = handleFactory.getAll(Invoice);
// exports.getInvoiceById = handleFactory.getOne(Invoice);
// exports.newInvoice = handleFactory.newOne(Invoice);
// exports.deleteInvoice = handleFactory.deleteOne(Invoice);
// exports.updateInvoice = handleFactory.updateOne(Invoice);