const Invoice = require("../Models/invoiceModel"); // Assuming your Invoice model is named invoiceModel.js
const Seller = require("../Models/Seller"); // Assuming your Invoice model is named invoiceModel.js
const Customer = require("../Models/customerModel"); // Assuming your Customer model is named customerModel.js
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const handleFactory = require("./handleFactory"); // Your generic factory handler
const mongoose = require("mongoose"); // For ObjectId validation
const { body, validationResult } = require("express-validator"); // Still imported, even if not directly used by all handlers
const PDFDocument = require("pdfkit"); // Import the PDF generation library

const ApiFeatures = require("../Utils/ApiFeatures"); // Import ApiFeatures

// Middleware to find duplicate invoices by invoiceNumber
exports.findDuplicateInvoice = catchAsync(async (req, res, next) => {
    if (!req.body.invoiceNumber) {
        return next(
            new AppError(
                "Invoice number is required to check for duplicates.",
                400,
            ),
        );
    }

    // Find a duplicate invoice by invoiceNumber (assuming invoiceNumber is unique globally, not per owner)
    const existingInvoice = await Invoice.findOne({
        invoiceNumber: req.body.invoiceNumber,
    });
    if (existingInvoice) {
        return next(
            new AppError(
                `Invoice with number ${req.body.invoiceNumber} already exists`,
                400,
            ),
        );
    }
    next(); // No duplicate found, proceed to the next middleware/handler
});

// Using handleFactory for basic CRUD operations (without explicit populate options here)
exports.getAllInvoice = handleFactory.getAll(Invoice);
exports.getInvoiceById = handleFactory.getOne(Invoice);
exports.newInvoice = handleFactory.create(Invoice);
exports.deleteInvoice = handleFactory.delete(Invoice);
exports.updateInvoice = handleFactory.update(Invoice);

exports.createInvoice = catchAsync(async (req, res, next) => {
    // Destructure all necessary fields from the request body
    const { buyer, seller, items, invoiceNumber, invoiceDate, status } =
        req.body;

    // --- 1. Validation ---
    if (!mongoose.Types.ObjectId.isValid(buyer)) {
        return next(new AppError("Invalid buyer (customer) ID provided.", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(seller)) {
        return next(new AppError("Invalid seller ID provided.", 400));
    }

    // --- 2. Check if Customer and Seller exist ---
    const customerExists = await Customer.findById(buyer);
    if (!customerExists) {
        return next(
            new AppError("Customer not found for the provided buyer ID.", 404),
        );
    }

    const sellerExists = await Seller.findById(seller);
    if (!sellerExists) {
        return next(
            new AppError("Seller not found for the provided seller ID.", 404),
        );
    }

    // --- 3. Create the Invoice ---
    // The invoiceModel's pre-save hook will handle stock reduction and total calculations.
    const newInvoice = await Invoice.create({
        ...req.body, // Pass the entire body to capture all fields
        owner: req.user._id, // Assign owner from the authenticated user
    });

    // --- 4. Update the Seller's record ---
    // This is the crucial step to link the invoice back to the seller.
    if (newInvoice && newInvoice.seller) {
        await Seller.findByIdAndUpdate(newInvoice.seller, {
            // Use $push to add the new invoice's ID to the seller's 'invoices' array
            $push: { invoices: newInvoice._id },
        });
    }

    // --- 5. Send the Response ---
    res.status(201).json({
        status: "success",
        statusCode: 201,
        data: newInvoice,
    });
});
// Helper function for product sales statistics (used by API and bot)
const productSalesStatistics = async (
    startDate,
    endDate,
    userId,
    isSuperAdmin,
) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError("Invalid date format. Please use YYYY-MM-DD.", 400);
    }

    let matchFilter = {
        invoiceDate: { $gte: start, $lte: end },
        status: "paid", // Only consider paid invoices for sales
    };

    if (!isSuperAdmin) {
        matchFilter.owner = userId; // Filter by owner if not super admin
    }

    try {
        const salesData = await Invoice.aggregate([
            {
                $match: matchFilter,
            },
            {
                $unwind: "$products", // Deconstruct the products array
            },
            {
                $group: {
                    _id: null,
                    totalSales: {
                        $sum: {
                            $multiply: [
                                "$products.quantity",
                                "$products.price",
                            ],
                        },
                    }, // Sum product-wise sales
                    invoicesCount: { $addToSet: "$_id" }, // Count unique invoices
                    productSales: {
                        $push: {
                            name: "$products.productName",
                            quantity: "$products.quantity",
                            price: "$products.price",
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalSales: 1,
                    invoicesCount: { $size: "$invoicesCount" },
                    productSales: {
                        $reduce: {
                            input: "$productSales",
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    "$$value",
                                    {
                                        $cond: {
                                            if: { $ne: ["$$this.name", null] },
                                            then: {
                                                $arrayToObject: [
                                                    [
                                                        {
                                                            k: "$$this.name",
                                                            v: {
                                                                $add: [
                                                                    {
                                                                        $ifNull:
                                                                            [
                                                                                {
                                                                                    $getField:
                                                                                        {
                                                                                            field: "$$this.name",
                                                                                            input: "$$value",
                                                                                        },
                                                                                },
                                                                                0,
                                                                            ],
                                                                    },
                                                                    {
                                                                        $multiply:
                                                                            [
                                                                                "$$this.quantity",
                                                                                "$$this.price",
                                                                            ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                ],
                                            },
                                            else: {},
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ]);

        return salesData.length > 0
            ? salesData[0]
            : { totalSales: 0, invoicesCount: 0, productSales: {} };
    } catch (error) {
        console.error("Error generating product sales statistics:", error);
        throw error; // Re-throw to be caught by catchAsync or bot handler
    }
};

// API handler for product sales
exports.getProductSales = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query; // Changed from req.body to req.query for API consistency
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === "superAdmin";

    const salesStats = await productSalesStatistics(
        startDate,
        endDate,
        userId,
        isSuperAdmin,
    );

    res.status(200).json({
        status: "success",
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
        throw new AppError("Invalid invoice ID.", 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const invoice = await Invoice.findOne(filter).populate(
        "customerId",
        "fullname email mobileNumber",
    );
    if (!invoice) {
        throw new AppError(
            `No invoice found with ID ${invoiceId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }
    return invoice;
};

exports.getAllInvoicesBot = async (userId, isSuperAdmin = false) => {
    let filter = {};
    if (!isSuperAdmin) {
        filter.owner = userId;
    }
    const invoices = await Invoice.find(filter).populate(
        "customerId",
        "fullname email mobileNumber",
    );
    return invoices;
};

exports.newInvoiceBot = async (invoiceData, userId) => {
    const {
        customerId,
        customerName,
        amount,
        status,
        productName,
        productQuantity,
        productPrice,
    } = invoiceData;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError("Invalid customer ID provided.", 400);
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new AppError(
            "Customer not found for the provided customerId",
            400,
        );
    }

    const productsArray = [
        {
            productName,
            quantity: parseInt(productQuantity, 10),
            price: parseFloat(productPrice),
        },
    ];

    const newInv = await Invoice.create({
        customerId,
        customerName: customerName || customer.fullname,
        amount: parseFloat(amount),
        status: status || "pending",
        products: productsArray,
        owner: userId, // Assign owner from bot user
    });
    return newInv;
};

exports.updateInvoiceBot = async (
    invoiceId,
    updateData,
    userId,
    isSuperAdmin = false,
) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError("Invalid invoice ID.", 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const updatedInv = await Invoice.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true,
    });
    if (!updatedInv) {
        throw new AppError(
            `No invoice found with ID ${invoiceId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }
    return updatedInv;
};

exports.deleteInvoiceBot = async (invoiceId, userId, isSuperAdmin = false) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError("Invalid invoice ID.", 400);
    }

    let filter = { _id: invoiceId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const invoice = await Invoice.findOneAndDelete(filter);
    if (!invoice) {
        throw new AppError(
            `No invoice found with ID ${invoiceId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }
    return { message: "Invoice deleted successfully" };
};

exports.getProductSalesBot = async (
    startDate,
    endDate,
    userId,
    isSuperAdmin = false,
) => {
    // This bot function now directly calls the shared productSalesStatistics helper
    return await productSalesStatistics(
        startDate,
        endDate,
        userId,
        isSuperAdmin,
    );
};

/**
 * @description Generates a PDF for a specific invoice and streams it to the client.
 */
exports.generateInvoicePDF = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

    // Fetch the invoice with all necessary details populated
    const invoice = await Invoice.findOne({ _id: id, ...ownerFilter })
        .populate("buyer")
        .populate("seller")
        .populate("items.product");

    if (!invoice) {
        return next(
            new AppError(
                "Invoice not found or you do not have permission.",
                404,
            ),
        );
    }

    // --- PDF Generation Starts Here ---
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set response headers to trigger a download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
    );

    // Pipe the PDF document directly to the response stream
    doc.pipe(res);

    // --- Helper Functions for PDF Layout ---
    const generateHeader = (doc) => {
        doc.fontSize(20).text(invoice.seller.shopName || "Seller Company", {
            align: "left",
        });
        doc.fontSize(10).text(invoice.seller.address.street || "", {
            align: "left",
        });
        doc.fontSize(10).text(
            `${invoice.seller.address.city || ""}, ${invoice.seller.address.state || ""} ${invoice.seller.address.pincode || ""}`,
            { align: "left" },
        );
        doc.fontSize(10).text(invoice.seller.contactNumber || "", {
            align: "left",
        });

        doc.fontSize(20).text("INVOICE", { align: "right" });
        doc.moveDown();
    };

    const generateCustomerInformation = (doc, invoice) => {
        doc.fontSize(10);
        doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: "left" });
        doc.text(
            `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`,
            { align: "left" },
        );
        doc.text(
            `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
            { align: "left" },
        );

        const customerX = 350;
        doc.text("Bill To:", customerX, 125);
        doc.font("Helvetica-Bold").text(invoice.buyer.fullname, customerX, 140);
        doc.font("Helvetica");
        if (invoice.buyer.addresses && invoice.buyer.addresses[0]) {
            const address = invoice.buyer.addresses[0];
            doc.text(`${address.street}, ${address.city}`, customerX, 155);
        }
        doc.moveDown(2);
    };

    const generateInvoiceTable = (doc, invoice) => {
        const tableTop = 250;
        const itemX = 50;
        const qtyX = 250;
        const rateX = 300;
        const amountX = 370;

        doc.font("Helvetica-Bold");
        doc.text("Item", itemX, tableTop);
        doc.text("Quantity", qtyX, tableTop, { width: 90, align: "right" });
        doc.text("Rate", rateX, tableTop, { width: 90, align: "right" });
        doc.text("Amount", amountX, tableTop, { width: 100, align: "right" });
        doc.font("Helvetica");

        let i = 0;
        for (const item of invoice.items) {
            const y = tableTop + (i + 1) * 30;
            doc.text(item.customTitle, itemX, y);
            doc.text(item.quantity.toString(), qtyX, y, {
                width: 90,
                align: "right",
            });
            doc.text(item.rate.toFixed(2), rateX, y, {
                width: 90,
                align: "right",
            });
            doc.text(item.amount.toFixed(2), amountX, y, {
                width: 100,
                align: "right",
            });
            i++;
        }

        const subtotalY = tableTop + (i + 1) * 30;
        doc.font("Helvetica-Bold").text("Subtotal:", 200, subtotalY, {
            align: "right",
        });
        doc.text(invoice.subTotal.toFixed(2), 0, subtotalY, { align: "right" });

        const gstY = subtotalY + 20;
        doc.font("Helvetica-Bold").text("GST:", 200, gstY, { align: "right" });
        doc.text(invoice.gst.toFixed(2), 0, gstY, { align: "right" });

        const totalY = gstY + 20;
        doc.font("Helvetica-Bold").text("Total:", 200, totalY, {
            align: "right",
        });
        doc.text(invoice.totalAmount.toFixed(2), 0, totalY, { align: "right" });
    };

    // --- Build the PDF ---
    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);

    // Finalize the PDF and end the stream
    doc.end();
});

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
// exports.newInvoice = handleFactory.create(Invoice);
// exports.deleteInvoice = handleFactory.delete(Invoice);
// exports.updateInvoice = handleFactory.update(Invoice);
