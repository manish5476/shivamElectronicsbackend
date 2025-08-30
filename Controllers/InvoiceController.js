const Invoice = require("../Models/invoiceModel"); // Assuming your Invoice model is named invoiceModel.js
const Seller = require("../Models/Seller"); // Assuming your Invoice model is named invoiceModel.js
const Customer = require("../Models/customerModel"); // Assuming your Customer model is named customerModel.js
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const handleFactory = require("./handleFactory"); // Your generic factory handler
const mongoose = require("mongoose"); // For ObjectId validation
const { body, validationResult } = require("express-validator"); // Still imported, even if not directly used by all handlers
const PDFDocument = require("pdfkit"); // Import the PDF generation library
const { toWords } = require("number-to-words");
const notificationService = require("../Services/notificationService"); // <-- ADD THIS
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

    if (newInvoice && newInvoice.items) {
        for (const item of newInvoice.items) {
            if (item.product) {
                await inventoryAlertService.checkStockAndSendAlert(
                    item.product,
                );
            }
        }
    }
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
// ///////////////////////////////////////////////////////////////////////////////////

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

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// // Helper function to generate PDF to a buffer
// const generatePdfToBuffer = (invoice) => {
//     return new Promise((resolve, reject) => {
//         const doc = new PDFDocument({ size: "A4", margin: 50 });
//         const buffers = [];

//         doc.on("data", buffers.push.bind(buffers));
//         doc.on("end", () => {
//             const pdfData = Buffer.concat(buffers);
//             resolve(pdfData);
//         });
//         doc.on("error", reject);

//         // --- PDF Content Generation (copied from your existing PDF logic) ---
//         // This should be the full PDF generation logic from your generateInvoicePDF function
//         doc.fontSize(20).text(`Invoice #${invoice.invoiceNumber}`, {
//             align: "center",
//         });
//         doc.moveDown();
//         doc.fontSize(12).text(`Customer: ${invoice.buyer.fullname}`);
//         doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
//         // ... Add the rest of your detailed PDF content generation here ...
//         doc.end();
//     });
// };

// // UPDATED createInvoice function
// exports.createInvoice = catchAsync(async (req, res, next) => {
//     const newInvoice = await Invoice.create({
//         ...req.body,
//         owner: req.user._id,
//     });

//     // --- NEW: Send Email to Customer ---
//     // We run this after sending the response to the client so it doesn't slow down the API request
//     res.status(201).json({
//         status: "success",
//         data: {
//             invoice: newInvoice,
//         },
//     });

//     // Post-response actions:
//     try {
//         const fullInvoice = await Invoice.findById(newInvoice._id).populate(
//             "buyer",
//         );
//         if (fullInvoice && fullInvoice.buyer) {
//             const pdfBuffer = await generatePdfToBuffer(fullInvoice);
//             await notificationService.sendInvoiceToCustomer(
//                 fullInvoice,
//                 pdfBuffer,
//             );
//         }
//     } catch (emailError) {
//         // Log the error, but don't crash the server as the invoice was already created.
//         console.error(
//             `Post-creation task failed for invoice ${newInvoice._id}:`,
//             emailError,
//         );
//     }
// });

// // --- NEW: Controller to manually send an invoice email ---
// exports.emailInvoice = catchAsync(async (req, res, next) => {
//     const invoice = await Invoice.findById(req.params.id).populate("buyer");

//     if (!invoice) {
//         return next(new AppError("No invoice found with that ID", 404));
//     }
//     if (!invoice.buyer || !invoice.buyer.email) {
//         return next(
//             new AppError(
//                 "This customer does not have an email address on file.",
//                 400,
//             ),
//         );
//     }

//     const pdfBuffer = await generatePdfToBuffer(invoice);
//     await notificationService.sendInvoiceToCustomer(invoice, pdfBuffer);

//     res.status(200).json({
//         status: "success",
//         message: `Invoice successfully sent to ${invoice.buyer.email}`,
//     });
// });

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// --- THEME & LAYOUT CONSTANTS ---
// Centralizing style makes it easy to change the invoice's look and feel.
const theme = {
    primaryColor: "#003366", // Deep Blue
    textColor: "#333333",
    lightTextColor: "#777777",
    borderColor: "#EAEAEA",
    headerFont: "Helvetica-Bold",
    bodyFont: "Helvetica",
    tableHeaderBG: "#F5F5F5",
    tableHeaderColor: "#333333",
    alternateRowBG: "#FAFAFA",
};

const layout = {
    margin: 50,
    pageWidth: 595.28, // A4 width
    contentWidth: 595.28 - 100,
};

/**
 * =================================================================
 * CONTROLLER FUNCTIONS
 * =================================================================
 */

// Controller to stream the PDF for direct download
exports.generateInvoicePDF = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

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

    const doc = buildInvoicePdf(invoice); // Use the main builder function

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
    );

    doc.pipe(res);
    doc.end();
});

// UPDATED createInvoice function
exports.createInvoice = catchAsync(async (req, res, next) => {
    const newInvoice = await Invoice.create({
        ...req.body,
        owner: req.user._id,
    });

    // Respond to the client immediately
    res.status(201).json({
        status: "success",
        data: {
            invoice: newInvoice,
        },
    });

    // Post-response: generate PDF and email to customer
    try {
        const fullInvoice = await Invoice.findById(newInvoice._id)
            .populate("buyer")
            .populate("seller");
        if (fullInvoice && fullInvoice.buyer && fullInvoice.buyer.email) {
            const pdfBuffer = await generatePdfToBuffer(fullInvoice);
            await notificationService.sendInvoiceToCustomer(
                fullInvoice,
                pdfBuffer,
            );
        }
    } catch (emailError) {
        console.error(
            `Post-creation task failed for invoice ${newInvoice._id}:`,
            emailError,
        );
    }
});

// Controller to manually send an invoice email
exports.emailInvoice = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate("buyer")
        .populate("seller");

    if (!invoice) {
        return next(new AppError("No invoice found with that ID", 404));
    }
    if (!invoice.buyer || !invoice.buyer.email) {
        return next(
            new AppError(
                "This customer does not have an email address on file.",
                400,
            ),
        );
    }

    const pdfBuffer = await generatePdfToBuffer(invoice);
    await notificationService.sendInvoiceToCustomer(invoice, pdfBuffer);

    res.status(200).json({
        status: "success",
        message: `Invoice successfully sent to ${invoice.buyer.email}`,
    });
});

/**
 * =================================================================
 * REUSABLE PDF GENERATION LOGIC
 * This is the single source of truth for the invoice design.
 * =================================================================
 */
const buildInvoicePdf = (invoice) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: layout.margin,
        bufferPages: true,
    });

    // --- BUILD THE PDF DOCUMENT ---
    // Each function is responsible for a section of the invoice.
    generateHeader(doc, invoice);
    let y = generateCustomerInformation(doc, invoice, 140);
    y = generateInvoiceTable(doc, invoice, y + 25);
    generateTotalsAndFooter(doc, invoice, y + 20);

    return doc;
};

// Helper function to generate PDF to a buffer for email attachments
const generatePdfToBuffer = (invoice) => {
    return new Promise((resolve, reject) => {
        const doc = buildInvoicePdf(invoice); // Use the main builder function
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
        doc.end();
    });
};

/**
 * =================================================================
 * HELPER FUNCTIONS FOR PDF SECTIONS (NOW WITH DEFENSIVE CHECKS)
 * =================================================================
 */

const generateHeader = (doc, invoice) => {
    doc.font(theme.headerFont)
        .fontSize(22)
        .fillColor(theme.primaryColor)
        .text("TAX INVOICE", { align: "right" });

    doc.moveDown(0.5);

    const invoiceDetails = [
        ["Invoice No:", invoice.invoiceNumber || "N/A"],
        [
            "Invoice Date:",
            new Date(invoice.invoiceDate).toLocaleDateString("en-IN"),
        ],
        ["Due Date:", new Date(invoice.dueDate).toLocaleDateString("en-IN")],
    ];

    let y = doc.y;
    invoiceDetails.forEach(([label, value]) => {
        doc.font(theme.bodyFont)
            .fontSize(10)
            .fillColor(theme.textColor)
            .text(label, { width: 90, align: "left" });
        doc.font(theme.headerFont)
            .fontSize(10)
            .fillColor(theme.textColor)
            .text(value, doc.x - 90, doc.y - 12, {
                width: 105,
                align: "right",
            });
        y += 15;
    });

    // Seller Info on the left with checks for missing data
    doc.font(theme.headerFont)
        .fontSize(14)
        .fillColor(theme.primaryColor)
        .text(
            invoice.seller?.shopName || "Seller Information Missing",
            layout.margin,
            57,
        );
    doc.font(theme.bodyFont)
        .fontSize(10)
        .fillColor(theme.lightTextColor)
        .text(invoice.seller?.address?.street || "")
        .text(
            `${invoice.seller?.address?.city || ""}, ${invoice.seller?.address?.state || ""} ${invoice.seller?.address?.pincode || ""}`,
        )
        .text(`GSTIN: ${invoice.seller?.gstin || "N/A"}`);
};

const generateCustomerInformation = (doc, invoice, y) => {
    generateHr(doc, y);
    y += 15;
    doc.fillColor(theme.textColor)
        .font(theme.headerFont)
        .fontSize(11)
        .text("Bill To:", layout.margin, y);

    y += 20;

    const billingAddress = invoice.buyer?.addresses?.[0] || {};
    doc.fillColor(theme.textColor).font(theme.bodyFont).fontSize(10);
    doc.font(theme.headerFont).text(
        invoice.buyer?.fullname || "Customer Name Missing",
        layout.margin,
        y,
    );
    doc.font(theme.bodyFont)
        .text(billingAddress.street || "", layout.margin, doc.y)
        .text(
            `${billingAddress.city || ""}, ${billingAddress.state || ""} ${billingAddress.pincode || ""}`,
            layout.margin,
            doc.y,
        )
        .text(`GSTIN: ${invoice.buyer?.gstin || "N/A"}`);

    return doc.y;
};

const generateInvoiceTable = (doc, invoice, y) => {
    const tableTop = y;
    const columns = [
        { title: "#", width: 30, align: "center" },
        { title: "Item Description", width: 230, align: "left" },
        { title: "Qty", width: 40, align: "right" },
        { title: "Rate", width: 70, align: "right" },
        { title: "GST", width: 40, align: "right" },
        { title: "Amount", width: 80, align: "right" },
    ];

    doc.font(theme.headerFont).fontSize(9);
    doc.rect(layout.margin, tableTop, layout.contentWidth, 20).fill(
        theme.tableHeaderBG,
    );
    doc.fillColor(theme.tableHeaderColor);

    let x = layout.margin;
    columns.forEach((col) => {
        doc.text(col.title, x + 5, tableTop + 6, {
            width: col.width - 10,
            align: col.align,
        });
        x += col.width;
    });

    let rowY = tableTop + 25;
    (invoice.items || []).forEach((item, i) => {
        if (i % 2 !== 0) {
            doc.rect(layout.margin, rowY - 5, layout.contentWidth, 20).fill(
                theme.alternateRowBG,
            );
        }
        const cells = [
            (i + 1).toString(),
            item.customTitle || item.product?.name || "N/A",
            item.quantity?.toString() || "0",
            formatCurrency(item.rate),
            `${item.gstRate || 0}%`,
            formatCurrency(item.amount),
        ];

        doc.font(theme.bodyFont).fontSize(9).fillColor(theme.textColor);
        let cellX = layout.margin;
        columns.forEach((col, j) => {
            doc.text(cells[j], cellX + 5, rowY, {
                width: col.width - 10,
                align: col.align,
            });
            cellX += col.width;
        });
        rowY += 20;
    });

    generateHr(doc, rowY);
    return rowY;
};

const generateTotalsAndFooter = (doc, invoice, y) => {
    let summaryY = y + 10;
    const summaryX = layout.pageWidth - layout.margin - 220;

    const summaryItems = [
        { label: "Subtotal:", value: formatCurrency(invoice.subTotal) },
        {
            label: "Total Discount:",
            value: formatCurrency(invoice.totalDiscount),
        },
        { label: "GST:", value: formatCurrency(invoice.gst) },
    ];

    summaryItems.forEach((item) => {
        doc.font(theme.bodyFont)
            .fontSize(10)
            .fillColor(theme.textColor)
            .text(item.label, summaryX, summaryY, { width: 100, align: "left" })
            .text(item.value, summaryX + 110, summaryY, {
                width: 100,
                align: "right",
            });
        summaryY += 18;
    });

    generateHr(doc, summaryY, summaryX, 220);
    summaryY += 10;

    doc.rect(summaryX, summaryY, 220, 25).fill(theme.primaryColor);
    doc.font(theme.headerFont)
        .fontSize(12)
        .fillColor("#FFFFFF")
        .text("Grand Total", summaryX + 10, summaryY + 7)
        .text(
            formatCurrency(invoice.totalAmount),
            summaryX + 110,
            summaryY + 7,
            { width: 100, align: "right" },
        );

    // Left side: Amount in words
    doc.font(theme.headerFont)
        .fontSize(10)
        .fillColor(theme.textColor)
        .text("Amount in Words:", layout.margin, y + 10);
    doc.font(theme.bodyFont)
        .fontSize(10)
        .fillColor(theme.lightTextColor)
        .text(
            `${toWords.convert(invoice.totalAmount || 0)} only.`,
            layout.margin,
            y + 25,
            { width: 250 },
        );

    generatePageFooter(doc, invoice);
};

const generatePageFooter = (doc, invoice) => {
    const pageBottom = doc.page.height - layout.margin;
    generateHr(doc, pageBottom - 20);
    doc.font(theme.bodyFont)
        .fontSize(8)
        .fillColor(theme.lightTextColor)
        .text(
            "This is a computer-generated invoice.",
            layout.margin,
            pageBottom - 10,
            { align: "center", width: layout.contentWidth },
        );
};

// --- UTILITY FUNCTIONS ---
const generateHr = (doc, y, x = layout.margin, width = layout.contentWidth) => {
    doc.strokeColor(theme.borderColor)
        .lineWidth(0.5)
        .moveTo(x, y)
        .lineTo(x + width, y)
        .stroke();
};

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
    });
};

// /**
//  * =================================================================
//  * HELPER FUNCTIONS FOR PDF SECTIONS
//  * =================================================================
//  */

// const generateHeader = async (doc, invoice) => {
//     // Attempt to add a company logo.
//     // Make sure 'logo.png' exists in your '/public/img/' directory.
//     try {
//         const logoPath = path.join(
//             __dirname,
//             "..",
//             "public",
//             "img",
//             "logo.png",
//         );
//         doc.image(logoPath, layout.margin, 40, { width: 150 });
//     } catch (error) {
//         console.warn("Logo not found. Falling back to text.");
//         doc.font(theme.headerFont)
//             .fontSize(20)
//             .fillColor(theme.primaryColor)
//             .text(invoice.seller.shopName, layout.margin, 57);
//     }

//     // Invoice Title and Details
//     doc.font(theme.headerFont)
//         .fontSize(22)
//         .fillColor(theme.primaryColor)
//         .text("TAX INVOICE", layout.pageWidth - layout.margin - 200, 57, {
//             width: 200,
//             align: "right",
//         });

//     const invoiceDetails = [
//         ["Invoice No:", invoice.invoiceNumber],
//         [
//             "Invoice Date:",
//             new Date(invoice.invoiceDate).toLocaleDateString("en-IN"),
//         ],
//         ["Due Date:", new Date(invoice.dueDate).toLocaleDateString("en-IN")],
//     ];

//     let y = 85;
//     invoiceDetails.forEach(([label, value]) => {
//         doc.font(theme.bodyFont)
//             .fontSize(10)
//             .fillColor(theme.textColor)
//             .text(label, 350, y, { width: 90, align: "left" });
//         doc.font(theme.headerFont)
//             .fontSize(10)
//             .fillColor(theme.textColor)
//             .text(value, 440, y, { width: 105, align: "right" });
//         y += 15;
//     });

//     return 140; // Return Y position after header
// };

// const generateCustomerInformation = (doc, invoice, y) => {
//     doc.fillColor(theme.textColor).font(theme.headerFont).fontSize(11);
//     doc.text("Bill To:", layout.margin, y);
//     doc.text("From (Seller):", layout.margin + layout.contentWidth / 2, y); // Changed 'Ship To' to 'From' for clarity
//     generateHr(doc, y + 15);

//     const billingAddress = invoice.buyer.addresses?.[0] || {};
//     const sellerAddress = invoice.seller.address || {};

//     doc.fillColor(theme.textColor).font(theme.bodyFont).fontSize(10);

//     // Buyer Info (Bill To)
//     doc.font(theme.headerFont).text(
//         invoice.buyer.fullname,
//         layout.margin,
//         y + 25,
//     );
//     doc.font(theme.bodyFont).text(
//         billingAddress.street || "",
//         layout.margin,
//         y + 40,
//     );
//     doc.text(
//         `${billingAddress.city || ""}, ${billingAddress.state || ""} ${billingAddress.pincode || ""}`,
//         layout.margin,
//         y + 55,
//     );

//     // Seller Info (From)
//     doc.font(theme.headerFont).text(
//         invoice.seller.shopName,
//         layout.margin + layout.contentWidth / 2,
//         y + 25,
//     );
//     doc.font(theme.bodyFont).text(
//         sellerAddress.street || "",
//         layout.margin + layout.contentWidth / 2,
//         y + 40,
//     );
//     doc.text(
//         `${sellerAddress.city || ""}, ${sellerAddress.state || ""} ${sellerAddress.pincode || ""}`,
//         layout.margin + layout.contentWidth / 2,
//         y + 55,
//     );

//     generateHr(doc, y + 75);
//     return y + 75;
// };

// const generateInvoiceTable = (doc, invoice, y) => {
//     const tableTop = y;
//     const columns = [
//         { title: "#", width: 30, align: "center" },
//         { title: "Item Description", width: 230, align: "left" },
//         { title: "Qty", width: 40, align: "right" },
//         { title: "Rate", width: 70, align: "right" },
//         { title: "GST", width: 40, align: "right" },
//         { title: "Amount", width: 80, align: "right" },
//     ];

//     // --- Table Header ---
//     doc.font(theme.headerFont).fontSize(9);
//     doc.rect(layout.margin, tableTop, layout.contentWidth, 20).fill(
//         theme.tableHeaderBG,
//     );
//     doc.fillColor(theme.tableHeaderColor);

//     let x = layout.margin;
//     columns.forEach((col) => {
//         doc.text(col.title, x + 5, tableTop + 6, {
//             width: col.width - 10,
//             align: col.align,
//         });
//         x += col.width;
//     });

//     // --- Table Body ---
//     let rowY = tableTop + 25; // Add some padding
//     invoice.items.forEach((item, i) => {
//         // Alternating row color
//         if (i % 2 !== 0) {
//             doc.rect(layout.margin, rowY - 5, layout.contentWidth, 25).fill(
//                 theme.alternateRowBG,
//             );
//         }

//         const itemDescription = item.customTitle || item.product?.name || "N/A";
//         const cells = [
//             (i + 1).toString(),
//             itemDescription,
//             item.quantity.toString(),
//             formatCurrency(item.rate),
//             `${item.gstRate}%`,
//             formatCurrency(item.amount),
//         ];

//         doc.font(theme.bodyFont).fontSize(9).fillColor(theme.textColor);

//         let cellX = layout.margin;
//         columns.forEach((col, j) => {
//             doc.text(cells[j], cellX + 5, rowY, {
//                 width: col.width - 10,
//                 align: col.align,
//             });
//             cellX += col.width;
//         });
//         rowY += 20; // Row height
//     });

//     return rowY + 10;
// };

// const generateTotalsAndFooter = (doc, invoice, y) => {
//     // --- Left side: Amount in words, Bank Details, Terms ---
//     doc.font(theme.headerFont).fontSize(10).fillColor(theme.textColor);
//     doc.text("Amount in Words:", layout.margin, y);
//     doc.font(theme.bodyFont).fontSize(10).fillColor(theme.lightTextColor);
//     doc.text(`${toWords(invoice.totalAmount)} only.`, layout.margin, y + 15, {
//         width: 250,
//     });

//     y += 50;

//     doc.font(theme.headerFont).fontSize(10).fillColor(theme.textColor);
//     doc.text("Bank Details:", layout.margin, y);
//     doc.font(theme.bodyFont).fontSize(10).fillColor(theme.lightTextColor);
//     doc.text(
//         `Bank Name: ${invoice.seller.bankDetails?.bankName || "N/A"}`,
//         layout.margin,
//         y + 15,
//     );
//     doc.text(
//         `Account No: ${invoice.seller.bankDetails?.accountNumber || "N/A"}`,
//         layout.margin,
//         y + 30,
//     );
//     doc.text(
//         `IFSC Code: ${invoice.seller.bankDetails?.ifscCode || "N/A"}`,
//         layout.margin,
//         y + 45,
//     );

//     const leftY = y + 65;

//     // --- Right side: Totals Summary ---
//     let summaryY = y - 50;
//     const summaryX = layout.pageWidth - layout.margin - 220;

//     const summaryItems = [
//         { label: "Subtotal:", value: formatCurrency(invoice.subTotal) },
//         {
//             label: "Total Discount:",
//             value: formatCurrency(invoice.totalDiscount),
//         },
//         { label: "GST:", value: formatCurrency(invoice.gst) },
//     ];

//     summaryItems.forEach((item) => {
//         doc.font(theme.bodyFont).fontSize(10).fillColor(theme.textColor);
//         doc.text(item.label, summaryX, summaryY, { width: 100, align: "left" });
//         doc.text(item.value, summaryX + 110, summaryY, {
//             width: 100,
//             align: "right",
//         });
//         summaryY += 20;
//     });

//     generateHr(doc, summaryY, summaryX, 220);
//     summaryY += 10;

//     // Grand Total
//     doc.rect(summaryX, summaryY, 220, 30).fill(theme.primaryColor);
//     doc.font(theme.headerFont).fontSize(12).fillColor("#FFFFFF");
//     doc.text("Grand Total", summaryX + 10, summaryY + 8);
//     doc.text(
//         formatCurrency(invoice.totalAmount),
//         summaryX + 110,
//         summaryY + 8,
//         { width: 100, align: "right" },
//     );

//     const rightY = summaryY + 50;

//     return { leftY, rightY };
// };
// // ✅ CORRECTED FUNCTION: Now accepts 'invoice' as an argument
// const generatePageFooter = (doc, invoice, y) => {
//     // Ensure footer is at the bottom of the page, regardless of content height
//     const pageBottom = doc.page.height - layout.margin - 40;
//     y = Math.max(y, pageBottom - 60);

//     generateHr(doc, y);

//     doc.font(theme.bodyFont).fontSize(9).fillColor(theme.lightTextColor);
//     doc.text(
//         `For ${invoice.seller.shopName}`,
//         layout.pageWidth - layout.margin - 200,
//         y + 15,
//         { width: 200, align: "right" },
//     );
//     doc.text(
//         "Authorised Signatory",
//         layout.pageWidth - layout.margin - 200,
//         y + 45,
//         { width: 200, align: "right" },
//     );

//     doc.text(
//         "Thank you for your business!",
//         layout.margin,
//         doc.page.height - layout.margin,
//         { align: "center", width: layout.contentWidth },
//     );
// };

// /**
//  * =================================================================
//  * UTILITY FUNCTIONS
//  * =================================================================
//  */

// const generateHr = (doc, y, x = layout.margin, width = layout.contentWidth) => {
//     doc.strokeColor(theme.borderColor)
//         .lineWidth(0.5)
//         .moveTo(x, y)
//         .lineTo(x + width, y)
//         .stroke();
// };

// const formatCurrency = (amount) => {
//     return (amount || 0).toLocaleString("en-IN", {
//         style: "currency",
//         currency: "INR",
//         minimumFractionDigits: 2,
//     });
// };

// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports.generateInvoicePDF = catchAsync(async (req, res, next) => {
//     const { id } = req.params;
//     const ownerFilter = req.user.role === 'superAdmin' ? {} : { owner: req.user._id };

//     const invoice = await Invoice.findOne({ _id: id, ...ownerFilter })
//         .populate('buyer')
//         .populate('seller')
//         .populate('items.product');

//     if (!invoice) {
//         return next(new AppError('Invoice not found or you do not have permission.', 404));
//     }

//     const doc = new PDFDocument({ size: 'A4', margin: 50 });
//     const buffers = [];

//     doc.on('data', buffers.push.bind(buffers));
//     doc.on('end', () => {
//         const pdfData = Buffer.concat(buffers);
//         res.writeHead(200, {
//             'Content-Type': 'application/pdf',
//             'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
//             'Content-Length': pdfData.length
//         });
//         res.end(pdfData);
//     });

//     // --- Helper Functions for PDF Layout ---
//     const generateHeader = (doc) => {
//         doc.fillColor('#444444')
//            .fontSize(20)
//            .text(invoice.seller.shopName || 'Shivam Electronics', 50, 57)
//            .fontSize(10)
//            .text(invoice.seller.address.street || 'f-8 JB Shoppin Center Jolwa', 50, 80)
//            .text(`${invoice.seller.address.city || ''}, ${invoice.seller.address.state || ''} ${invoice.seller.address.pincode || ''}`, 50, 95)
//            .text(invoice.seller.contactNumber || '', 50, 110);

//         doc.fillColor('#444444')
//            .fontSize(20)
//            .text('INVOICE', 275, 57, { align: 'right' })
//            .fontSize(10)
//            .text(`Invoice No: ${invoice.invoiceNumber}`, 275, 80, { align: 'right' })
//            .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 275, 95, { align: 'right' })
//            .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 275, 110, { align: 'right' });

//         doc.moveDown(5);
//     };

//     const generateCustomerInformation = (doc) => {
//         doc.rect(50, 160, 500, 60).stroke();
//         doc.fillColor('#444444')
//            .fontSize(12)
//            .font('Helvetica-Bold')
//            .text('Buyer Details', 60, 170);

//         doc.font('Helvetica')
//            .fontSize(10)
//            .text(`Buyer Name: ${invoice.buyer.fullname}`, 60, 190)
//            .text(`Address: ${invoice.buyer.addresses?.[0]?.street || ''}, ${invoice.buyer.addresses?.[0]?.city || ''}`, 300, 190);
//     };

//     const generateInvoiceTable = (doc, invoice) => {
//         const tableTop = 250;
//         const columns = [
//             { title: "Sr.", x: 50, width: 20, align: 'center' },
//             { title: "Item", x: 70, width: 140, align: 'left' },
//             { title: "Qty", x: 210, width: 30, align: 'right' },
//             { title: "Rate", x: 240, width: 50, align: 'right' },
//             { title: "Discount", x: 290, width: 50, align: 'right' },
//             { title: "Taxable", x: 340, width: 50, align: 'right' },
//             { title: "GST %", x: 390, width: 40, align: 'right' },
//             { title: "GST Amt", x: 430, width: 60, align: 'right' },
//             { title: "Amount", x: 490, width: 60, align: 'right' }
//         ];

//         // --- Table Header with Color ---
//         doc.font('Helvetica-Bold')
//            .fontSize(10)
//            .fillColor('#ffffff')
//            .rect(50, tableTop, 500, 20)
//            .fill('#2c3e50'); // Dark blue header background

//         doc.fillColor('#ffffff');
//         generateTableRow(doc, tableTop + 5, columns, ["Sr.", "Item", "Qty", "Rate", "Discount", "Taxable", "GST %", "GST Amt", "Amount"]);

//         doc.fillColor('#000000');
//         generateHr(doc, tableTop + 20);

//         // --- Table Body with Alternating Row Colors ---
//         doc.font('Helvetica')
//            .fontSize(9);

//         let bodyY = tableTop + 20;
//         for (let i = 0; i < invoice.items.length; i++) {
//             const item = invoice.items[i];
//             const cells = [
//                 (i + 1).toString(),
//                 item.customTitle || item.product?.name || "",
//                 item.quantity.toString(),
//                 formatCurrency(item.rate),
//                 formatCurrency(item.discount),
//                 formatCurrency(item.taxableValue),
//                 `${item.gstRate}%`,
//                 formatCurrency(item.gstAmount),
//                 formatCurrency(item.amount)
//             ];

//             // Alternating row color
//             if (i % 2 === 0) {
//                 doc.fillColor('#f0f0f0')
//                    .rect(50, bodyY, 500, 25)
//                    .fill();
//             }
//             doc.fillColor('#000000');

//             // Calculate dynamic row height for text wrapping
//             let maxHeight = 0;
//             columns.forEach((col, index) => {
//                 const text = cells[index];
//                 const opts = { width: col.width, align: col.align, continued: false };
//                 const height = doc.heightOfString(text, opts);
//                 if (height > maxHeight) maxHeight = height;
//             });
//             const rowHeight = Math.max(25, maxHeight + 10); // Minimum 25px with padding

//             generateTableRow(doc, bodyY + 5, columns, cells);

//             generateHr(doc, bodyY + rowHeight);
//             bodyY += rowHeight;
//         }

//         // --- Draw Vertical Lines for Full Table Borders ---
//         generateVerticalLines(doc, columns, tableTop, bodyY);

//         // Return the Y position after the table for summary
//         return bodyY + 20;
//     };

//     const generateSummaryTable = (doc, invoice, yStart) => {
//         const summaryColumns = [
//             { title: "Description", x: 350, width: 100, align: 'left' },
//             { title: "Amount", x: 450, width: 100, align: 'right' }
//         ];

//         // --- Summary Header ---
//         doc.font('Helvetica-Bold')
//            .fontSize(10)
//            .fillColor('#ffffff')
//            .rect(350, yStart, 200, 20)
//            .fill('#34495e'); // Slightly different blue for summary header
//         doc.fillColor('#ffffff')
//            .text('Summary', 350, yStart + 5, { width: 200, align: 'center' });

//         generateHr(doc, yStart + 20);

//         // --- Summary Rows ---
//         doc.font('Helvetica')
//            .fontSize(9)
//            .fillColor('#000000');

//         const rows = [
//             ["Subtotal", formatCurrency(invoice.subTotal)],
//             ["Total Discount", formatCurrency(invoice.totalDiscount)],
//             ["IGST", formatCurrency(invoice.gst)],
//             ["Total Amount", formatCurrency(invoice.totalAmount)]
//         ];

//         let rowY = yStart + 20;
//         rows.forEach((row, index) => {
//             // Highlight total row
//             if (index === 3) {
//                 doc.font('Helvetica-Bold')
//                    .fillColor('#ffffff')
//                    .rect(350, rowY, 200, 20)
//                    .fill('#27ae60'); // Green for total
//                 doc.fillColor('#ffffff');
//             } else {
//                 if (index % 2 === 0) {
//                     doc.fillColor('#f9f9f9')
//                        .rect(350, rowY, 200, 20)
//                        .fill();
//                 }
//                 doc.fillColor('#000000');
//             }

//             doc.text(row[0], 360, rowY + 5, { width: 90, align: 'left' });
//             doc.text(row[1], 450, rowY + 5, { width: 90, align: 'right' });

//             generateHr(doc, rowY + 20);
//             rowY += 20;
//         });

//         // --- Vertical Lines for Summary Table ---
//         doc.strokeColor("#aaaaaa")
//            .lineWidth(0.5)
//            .moveTo(350, yStart)
//            .lineTo(350, rowY)
//            .moveTo(450, yStart)
//            .lineTo(450, rowY)
//            .moveTo(550, yStart)
//            .lineTo(550, rowY)
//            .stroke();

//         // Return Y position after summary
//         return rowY + 20;
//     };

//     const generateFooter = (doc, invoice, yStart) => {
//         doc.fontSize(10)
//            .fillColor('#444444')
//            .text(`Amount in Words: Rupees ${toWords(invoice.totalAmount)} Only`, 50, yStart, { width: 500, align: 'left' })
//            .text('For Shivam Electronics', 50, yStart + 40, { width: 500, align: 'right' })
//            .text('Authorised Signatory', 50, yStart + 60, { width: 500, align: 'right' });
//     };

//     const generateTableRow = (doc, y, columns, cells) => {
//         columns.forEach((col, index) => {
//             doc.text(cells[index], col.x, y, { width: col.width, align: col.align });
//         });
//     };

//     const generateHr = (doc, y) => {
//         doc.strokeColor("#aaaaaa")
//            .lineWidth(0.5)
//            .moveTo(50, y)
//            .lineTo(550, y)
//            .stroke();
//     };

//     const generateVerticalLines = (doc, columns, topY, bottomY) => {
//         doc.strokeColor("#aaaaaa")
//            .lineWidth(0.5);
//         columns.forEach((col) => {
//             doc.moveTo(col.x, topY)
//                .lineTo(col.x, bottomY)
//                .stroke();
//         });
//         // Rightmost line
//         const lastX = columns[columns.length - 1].x + columns[columns.length - 1].width;
//         doc.moveTo(lastX, topY)
//            .lineTo(lastX, bottomY)
//            .stroke();
//     };

//     const formatCurrency = (amount) => {
//         if (amount === null || typeof amount === 'undefined') {
//             amount = 0;
//         }
//         return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
//     };

//     // --- Build the PDF ---
//     generateHeader(doc);
//     generateCustomerInformation(doc);
//     const tableEndY = generateInvoiceTable(doc, invoice);
//     const summaryEndY = generateSummaryTable(doc, invoice, tableEndY);
//     generateFooter(doc, invoice, summaryEndY);

//     // Finalize the PDF
//     doc.end();
// });

// // exports.generateInvoicePDF = catchAsync(async (req, res, next) => {
// //     const { id } = req.params;
// //     const ownerFilter = req.user.role === 'superAdmin' ? {} : { owner: req.user._id };

// //     const invoice = await Invoice.findOne({ _id: id, ...ownerFilter })
// //         .populate('buyer')
// //         .populate('seller')
// //         .populate('items.product');

// //     if (!invoice) {
// //         return next(new AppError('Invoice not found or you do not have permission.', 404));
// //     }

// //     const doc = new PDFDocument({ size: 'A4', margin: 50 });
// //     const buffers = [];

// //     doc.on('data', buffers.push.bind(buffers));
// //     doc.on('end', () => {
// //         const pdfData = Buffer.concat(buffers);
// //         res.writeHead(200, {
// //             'Content-Type': 'application/pdf',
// //             'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
// //             'Content-Length': pdfData.length
// //         });
// //         res.end(pdfData);
// //     });

// //     // --- Helper Functions for PDF Layout ---
// //     const generateHeader = (doc) => {
// //         doc.fillColor('#444444')
// //            .fontSize(20)
// //            .text(invoice.seller.shopName || 'Shivam Electronics', 50, 57)
// //            .fontSize(10)
// //            .text(invoice.seller.address.street || 'f-8 JB Shoppin Center Jolwa', 50, 80)
// //            .text(`${invoice.seller.address.city || ''}, ${invoice.seller.address.state || ''} ${invoice.seller.address.pincode || ''}`, 50, 95)
// //            .text(invoice.seller.contactNumber || '', 50, 110);

// //         doc.fillColor('#444444')
// //            .fontSize(20)
// //            .text('INVOICE', 275, 57, { align: 'right' })
// //            .fontSize(10)
// //            .text(`Invoice No: ${invoice.invoiceNumber}`, 275, 80, { align: 'right' })
// //            .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 275, 95, { align: 'right' })
// //            .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 275, 110, { align: 'right' });

// //         doc.moveDown(5);
// //     };

// //     const generateCustomerInformation = (doc) => {
// //         doc.rect(50, 160, 500, 60).stroke();
// //         doc.fillColor('#444444')
// //            .fontSize(12)
// //            .font('Helvetica-Bold')
// //            .text('Buyer Details', 60, 170);

// //         doc.font('Helvetica')
// //            .fontSize(10)
// //            .text(`Buyer Name: ${invoice.buyer.fullname}`, 60, 190)
// //            .text(`Address: ${invoice.buyer.addresses?.[0]?.street || ''}, ${invoice.buyer.addresses?.[0]?.city || ''}`, 300, 190);
// //     };

// //     const generateInvoiceTable = (doc, invoice) => {
// //         let i;
// //         const invoiceTableTop = 250;

// //         doc.font('Helvetica-Bold');
// //         generateTableRow(doc, invoiceTableTop, "Sr.", "Item", "HSN/SAC", "Qty", "Rate", "Discount", "Taxable", "GST %", "GST Amt", "Amount");
// //         generateHr(doc, invoiceTableTop + 20);
// //         doc.font('Helvetica');

// //         for (i = 0; i < invoice.items.length; i++) {
// //             const item = invoice.items[i];
// //             const position = invoiceTableTop + (i + 1) * 30;
// //             generateTableRow(
// //                 doc,
// //                 position,
// //                 i + 1,
// //                 item.customTitle,
// //                 item.product?.hsnSac || 'N/A',
// //                 item.quantity,
// //                 formatCurrency(item.rate),
// //                 formatCurrency(item.discount),
// //                 formatCurrency(item.taxableValue),
// //                 `${item.gstRate}%`,
// //                 formatCurrency(item.gstAmount),
// //                 formatCurrency(item.amount)
// //             );
// //             generateHr(doc, position + 20);
// //         }

// //         // --- IMPROVED SUMMARY SECTION ---
// //         const summaryY = invoiceTableTop + (i + 2) * 30;
// //         doc.font('Helvetica');
// //         doc.text('Subtotal:', 350, summaryY, { align: 'right', width: 100 });
// //         doc.text(formatCurrency(invoice.subTotal), 450, summaryY, { align: 'right' });

// //         doc.text('Total Discount:', 350, summaryY + 20, { align: 'right', width: 100 });
// //         doc.text(formatCurrency(invoice.totalDiscount), 450, summaryY + 20, { align: 'right' });

// //         doc.text('IGST:', 350, summaryY + 40, { align: 'right', width: 100 });
// //         doc.text(formatCurrency(invoice.gst), 450, summaryY + 40, { align: 'right' });

// //         generateHr(doc, summaryY + 65);

// //         doc.font('Helvetica-Bold');
// //         doc.text('Total Amount:', 350, summaryY + 75, { align: 'right', width: 100 });
// //         doc.text(formatCurrency(invoice.totalAmount), 450, summaryY + 75, { align: 'right' });
// //         doc.font('Helvetica');
// //     };

// //     const generateFooter = (doc) => {
// //         // Adjust Y position based on the new summary table height
// //         const footerY = doc.y + 50; // Add some space after the table
// //         doc.fontSize(10).text(`Amount in Words: Rupees ${toWords(invoice.totalAmount)} Only`, 50, footerY, { align: 'left' });
// //         doc.fontSize(10).text('For Shivam Electronics', 50, footerY + 40, { align: 'right' });
// //         doc.fontSize(10).text('Authorised Signatory', 50, footerY + 60, { align: 'right' });
// //     };

// //     const generateTableRow = (doc, y, sr, item, hsn, qty, rate, discount, taxable, gstRate, gstAmt, amount) => {
// //         doc.fontSize(8)
// //            .text(sr.toString(), 50, y)
// //            .text(item, 80, y, { width: 100 })
// //            .text(hsn, 180, y, { width: 60, align: 'right' })
// //            .text(qty.toString(), 250, y, { width: 30, align: 'right' })
// //            .text(rate.toString(), 290, y, { width: 50, align: 'right' })
// //            .text(discount.toString(), 340, y, { width: 40, align: 'right' })
// //            .text(taxable.toString(), 390, y, { width: 50, align: 'right' })
// //            .text(gstRate.toString(), 440, y, { width: 40, align: 'right' })
// //            .text(gstAmt.toString(), 480, y, { width: 50, align: 'right' })
// //            .text(amount.toString(), 0, y, { align: 'right' });
// //     };

// //     const generateHr = (doc, y) => {
// //         doc.strokeColor("#aaaaaa")
// //            .lineWidth(1)
// //            .moveTo(50, y)
// //            .lineTo(550, y)
// //            .stroke();
// //     };

// //     const formatCurrency = (amount) => {
// //         if (amount === null || typeof amount === 'undefined') {
// //             amount = 0;
// //         }
// //         return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
// //     };

// //     // --- Build the PDF ---
// //     generateHeader(doc);
// //     generateCustomerInformation(doc);
// //     generateInvoiceTable(doc, invoice);
// //     generateFooter(doc);

// //     // Finalize the PDF
// //     doc.end();
// // });
