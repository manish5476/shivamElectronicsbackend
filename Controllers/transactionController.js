const catchAsync = require("../Utils/catchAsyncModule");
const Invoice = require("../Models/invoiceModel");
const Payment = require("../Models/paymentModel");
const Product = require("../Models/productModel");
const Customer = require("../Models/customerModel");
const Seller = require("../Models/Seller");
const AppError = require("../Utils/appError");

// Helper function to get the owner filter based on user role
const getOwnerFilter = (req) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === "superAdmin";
    return isSuperAdmin ? {} : { owner: userId };
};

/**
 * @description Fetches and formats sales transactions from invoices.
 */
async function getSalesTransactions(ownerFilter, dateFilter, status) {
    const salesMatchStage = { ...ownerFilter };
    if (dateFilter.date) salesMatchStage.invoiceDate = dateFilter.date;
    if (status) salesMatchStage.status = status;

    return Invoice.aggregate([
        { $match: salesMatchStage },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "customers",
                localField: "buyer",
                foreignField: "_id",
                as: "customerDetails",
            },
        },
        {
            $lookup: {
                from: "sellers",
                localField: "seller",
                foreignField: "_id",
                as: "sellerDetails",
            },
        },
        {
            $unwind: {
                path: "$customerDetails",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$sellerDetails",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                _id: "$_id",
                type: "Sale",
                date: "$invoiceDate",
                amount: "$items.amount",
                description: {
                    $concat: [
                        "Sold ",
                        { $toString: "$items.quantity" },
                        " x ",
                        "$items.customTitle",
                    ],
                },
                customer: "$customerDetails.fullname",
                seller: "$sellerDetails.name",
                status: "$status",
                reference: "$invoiceNumber",
            },
        },
    ]);
}

/**
 * @description Fetches and formats payment transactions.
 */
async function getPaymentTransactions(
    ownerFilter,
    dateFilter,
    paymentMethod,
    status,
) {
    const paymentMatchStage = { ...ownerFilter };
    if (dateFilter.date) paymentMatchStage.date = dateFilter.date;
    if (paymentMethod) paymentMatchStage.paymentMethod = paymentMethod;
    if (status) paymentMatchStage.status = status;

    return Payment.aggregate([
        { $match: paymentMatchStage },
        {
            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customerDetails",
            },
        },
        {
            $unwind: {
                path: "$customerDetails",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                _id: "$_id",
                type: "Payment",
                date: "$date",
                amount: "$amount",
                description: { $concat: ["Payment via ", "$paymentMethod"] },
                customer: "$customerDetails.fullname",
                seller: null,
                status: "$status",
                reference: "$transactionId",
            },
        },
    ]);
}

/**
 * @description Fetches and formats product creation/update transactions.
 */
async function getProductTransactions(ownerFilter, dateFilter) {
    const matchStage = { ...ownerFilter };
    if (dateFilter.date) matchStage.createdAt = dateFilter.date;

    return Product.aggregate([
        { $match: matchStage },
        {
            $project: {
                _id: "$_id",
                type: "Product",
                date: "$createdAt",
                amount: null,
                description: {
                    $concat: ["Product '", "$title", "' was created."],
                },
                customer: null,
                seller: null,
                status: "Completed",
                reference: "$sku",
            },
        },
    ]);
}

/**
 * @description Fetches and formats customer creation/update transactions.
 */
async function getCustomerTransactions(ownerFilter, dateFilter) {
    const matchStage = { ...ownerFilter };
    if (dateFilter.date) matchStage.createdAt = dateFilter.date;

    return Customer.aggregate([
        { $match: matchStage },
        {
            $project: {
                _id: "$_id",
                type: "Customer",
                date: "$createdAt",
                amount: null,
                description: {
                    $concat: ["Customer '", "$fullname", "' was created."],
                },
                customer: "$fullname",
                seller: null,
                status: "$status",
                reference: "$email",
            },
        },
    ]);
}

/**
 * @description Fetches and formats seller creation/update transactions.
 */
async function getSellerTransactions(ownerFilter, dateFilter) {
    const matchStage = { ...ownerFilter };
    if (dateFilter.date) matchStage.createdAt = dateFilter.date;

    return Seller.aggregate([
        { $match: matchStage },
        {
            $project: {
                _id: "$_id",
                type: "Seller",
                date: "$createdAt",
                amount: null,
                description: {
                    $concat: ["Seller '", "$name", "' was created."],
                },
                customer: null,
                seller: "$name",
                status: "$status",
                reference: "$shopName",
            },
        },
    ]);
}

exports.getAllTransactions = catchAsync(async (req, res, next) => {
    const { startDate, endDate, type, paymentMethod, status } = req.query;
    const ownerFilter = getOwnerFilter(req);

    const dateFilter = {};
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return next(
                new AppError(
                    "Invalid date format. Please use YYYY-MM-DD.",
                    400,
                ),
            );
        }
        dateFilter.date = { $gte: start, $lte: end };
    }

    const transactionPromises = [];

    if (!type || type === "sales") {
        transactionPromises.push(
            getSalesTransactions(ownerFilter, dateFilter, status),
        );
    }
    if (!type || type === "payments") {
        transactionPromises.push(
            getPaymentTransactions(
                ownerFilter,
                dateFilter,
                paymentMethod,
                status,
            ),
        );
    }
    if (!type || type === "products") {
        transactionPromises.push(
            getProductTransactions(ownerFilter, dateFilter),
        );
    }
    if (!type || type === "customers") {
        transactionPromises.push(
            getCustomerTransactions(ownerFilter, dateFilter),
        );
    }
    if (!type || type === "sellers") {
        transactionPromises.push(
            getSellerTransactions(ownerFilter, dateFilter),
        );
    }

    const transactionResults = await Promise.all(transactionPromises);
    const allTransactions = transactionResults.flat();
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
        status: "success",
        results: allTransactions.length,
        data: allTransactions,
    });
});
