const catchAsync = require("../Utils/catchAsyncModule");
const Invoice = require("../Models/invoiceModel");
const Payment = require("../Models/paymentModel");
const AppError = require("../Utils/appError");

// Helper function to get the owner filter based on user role
const getOwnerFilter = (req) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === "superAdmin";
    return isSuperAdmin ? {} : { owner: userId };
};

/**
 * @description Fetches and formats sales transactions from invoices.
 * @param {object} ownerFilter - Filter to apply based on the user's role.
 * @param {object} dateFilter - Filter to apply for the date range.
 * @param {string} status - Filter by transaction status.
 * @returns {Promise<Array>} A promise that resolves to an array of sales transactions.
 */
async function getSalesTransactions(ownerFilter, dateFilter, status) {
    const salesMatchStage = { ...ownerFilter };
    if (dateFilter.date) {
        salesMatchStage.invoiceDate = dateFilter.date;
    }
    if (status) {
        salesMatchStage.status = status;
    }

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
 * @param {object} ownerFilter - Filter to apply based on the user's role.
 * @param {object} dateFilter - Filter to apply for the date range.
 * @param {string} paymentMethod - Filter by payment method.
 * @param {string} status - Filter by transaction status.
 * @returns {Promise<Array>} A promise that resolves to an array of payment transactions.
 */
async function getPaymentTransactions(
    ownerFilter,
    dateFilter,
    paymentMethod,
    status,
) {
    const paymentMatchStage = { ...ownerFilter };
    if (dateFilter.date) {
        paymentMatchStage.date = dateFilter.date;
    }
    if (paymentMethod) {
        paymentMatchStage.paymentMethod = paymentMethod;
    }
    if (status) {
        paymentMatchStage.status = status;
    }

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
                seller: null, // Payments don't have a direct seller in your model
                status: "$status",
                reference: "$transactionId",
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

    // Conditionally add promises to the array based on the 'type' filter
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

    // Run fetches in parallel for better performance
    const transactionResults = await Promise.all(transactionPromises);

    // Flatten the array of arrays into a single array
    const allTransactions = transactionResults.flat();

    // Sort the combined results by date, descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
        status: "success",
        results: allTransactions.length,
        data: allTransactions,
    });
});
