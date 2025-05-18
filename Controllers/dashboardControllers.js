

// const Customer = require('../Models/customerModel');
// const Invoice=require("../Models/invoiceModel")
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const { body, validationResult } = require('express-validator');


// Import Mongoose Models
const Invoice = require('../Models/invoiceModel');
const Product = require('../Models/productModel');
const Customer = require('../Models/customerModel');
const Payment = require('../Models/paymentModel');
const Review = require('../Models/ReviewModel');
// const Seller = require('./Models/sellerModel'); // If you have seller stats
// --- Date Range Helper Function ---
/**
 * Calculates start and end dates based on a period string or custom dates.
 * @param {String} period - e.g., 'today', 'week', 'month', 'year', 'last_month', 'yesterday'.
 * @param {String} queryStartDate - Custom start date (YYYY-MM-DD).
 * @param {String} queryEndDate - Custom end date (YYYY-MM-DD).
 * @returns {Object} { startDate: Date | null, endDate: Date | null }
 */
const getDateRange = (period, queryStartDate, queryEndDate) => {
    let startDate, endDate;
    const today = new Date(); // Current date for reference, e.g., 2025-05-18
    today.setHours(23, 59, 59, 999); // End of today

    // If custom dates are provided, they take precedence
    if (queryStartDate && queryEndDate) {
        startDate = new Date(queryStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(queryEndDate);
        endDate.setHours(23, 59, 59, 999);
        // Cap endDate at today if it's in the future
        if (endDate > today) endDate = new Date(today);
        return { startDate, endDate };
    }

    // Default endDate for period calculations is usually today's end
    endDate = new Date(today);

    switch (period) {
        case 'today':
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate); // End of yesterday
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week': // Current week (assuming Sunday as start of week)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay()); // Go to Sunday
            startDate.setHours(0, 0, 0, 0);
            // endDate is end of today (or you could set to end of Saturday)
            break;
        case 'month': // Current month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            // endDate is end of today (or end of the current month)
            break;
        case 'last_month':
            const lastMonthDate = new Date(today);
            lastMonthDate.setMonth(today.getMonth() - 1); // Go to previous month
            startDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0); // Last day of last month
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year': // Current year
            startDate = new Date(today.getFullYear(), 0, 1); // January 1st
            startDate.setHours(0, 0, 0, 0);
            // endDate is end of today (or end of the current year)
            break;
        default: // No period or unrecognized, fetch all time or a default like last 30 days
            // For "all time", startDate and endDate would be null or very broad
            // For this example, let's default to no specific date filtering if period is invalid
            startDate = null;
            endDate = null;
            // If you prefer a default like last 30 days:
            // endDate = new Date(today);
            // startDate = new Date(today);
            // startDate.setDate(today.getDate() - 30);
            // startDate.setHours(0, 0, 0, 0);
            break;
    }

    // Ensure endDate is not in the future if it was calculated for a period
    if (endDate && endDate > today && period !== 'last_month') { // last_month already has a fixed historical end date
        endDate = new Date(today);
    }

    return { startDate, endDate };
};

// --- Controller Functions ---

// Consolidated Summary
exports.getDashboardSummary = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const lowStockThreshold = parseInt(req.query.lowStockThreshold) || 10;
        const listLimits = parseInt(req.query.listLimits) || 15;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const dateMatchCriteria = (sDate, eDate, dateField = "invoiceDate") => {
            const match = {};
            if (sDate && eDate) {
                match[dateField] = { $gte: sDate, $lte: eDate };
            }
            return match;
        };

        // Parallel execution for speed
        const [
            totalRevenueData,
            salesCountData,
            lowStockProductsData,
            topSellingProductsData,
            customersWithDuesData,
            newCustomersCountData,
            totalPaymentsReceivedData
        ] = await Promise.all([
            // Total Revenue
            Invoice.aggregate([
                { $match: dateMatchCriteria(startDate, endDate) },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            // Sales Count
            Invoice.countDocuments(dateMatchCriteria(startDate, endDate)),
            // Low Stock Products
            Product.find({ stock: { $lt: lowStockThreshold, $gt: 0 } }).limit(listLimits).select('title stock sku'),
            // Top Selling Products (by revenue)
            Invoice.aggregate([
                { $match: dateMatchCriteria(startDate, endDate) },
                { $unwind: "$items" },
                { $group: { _id: "$items.product", totalRevenue: { $sum: "$items.amount" }, totalQuantitySold: { $sum: "$items.quantity" }}},
                { $sort: { totalRevenue: -1 } }, { $limit: listLimits },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" }},
                { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true }},
                { $project: { productId: "$_id", title: { $ifNull: ["$productDetails.title", "$items.customTitle"] }, totalRevenue: 1, totalQuantitySold: 1 }}
            ]),
            // Customers with Dues
            Customer.find({ remainingAmount: { $gt: 0 } }).sort({ remainingAmount: -1 }).limit(listLimits).select('fullname mobileNumber email remainingAmount'),
            // New Customers Count
            Customer.countDocuments(dateMatchCriteria(startDate, endDate, "createdAt")),
            // Total Payments Received
            Payment.aggregate([
                { $match: { ...dateMatchCriteria(startDate, endDate, "createdAt"), status: 'completed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        const revenue = totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;
        const salesCount = salesCountData || 0;

        res.status(200).json({
            success: true,
            data: {
                sales: {
                    totalRevenue: revenue,
                    numberOfSales: salesCount,
                    averageOrderValue: salesCount > 0 ? revenue / salesCount : 0,
                },
                products: {
                    lowStock: lowStockProductsData,
                    topSelling: topSellingProductsData,
                },
                customers: {
                    outstandingPayments: customersWithDuesData,
                    newCustomersCount: newCustomersCountData,
                },
                payments: {
                    totalReceived: totalPaymentsReceivedData.length > 0 ? totalPaymentsReceivedData[0].total : 0,
                }
                // Add more sections as needed (e.g., recent reviews)
            }
        });
    } catch (error) {
        console.error("Error in getDashboardSummary:", error);
        next(error); // Pass error to global error handler
    }
};


// --- Sales Statistics ---
exports.getTotalRevenue = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const matchStage = {};
        if (startDate && endDate) {
            matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
        }
        // Optional: matchStage.status = 'paid';

        const revenueData = await Invoice.aggregate([
            { $match: matchStage },
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        res.status(200).json({ success: true, data: { totalRevenue } });
    } catch (error) {
        next(error);
    }
};

exports.getSalesCount = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const query = {};
        if (startDate && endDate) {
            query.invoiceDate = { $gte: startDate, $lte: endDate };
        }
        // Optional: query.status = 'paid';
        const salesCount = await Invoice.countDocuments(query);
        res.status(200).json({ success: true, data: { salesCount } });
    } catch (error) {
        next(error);
    }
};

exports.getAverageOrderValue = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const matchStage = {};
        if (startDate && endDate) {
            matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
        }
        // Optional: matchStage.status = 'paid';

        const salesData = await Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    numberOfSales: { $sum: 1 } // Counts each invoice as one sale
                }
            }
        ]);
        let averageOrderValue = 0;
        if (salesData.length > 0 && salesData[0].numberOfSales > 0) {
            averageOrderValue = salesData[0].totalRevenue / salesData[0].numberOfSales;
        }
        res.status(200).json({ success: true, data: { averageOrderValue } });
    } catch (error) {
        next(error);
    }
};

exports.getSalesTrends = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const NdaysAgo = new Date(); // e.g., 2025-05-18
        NdaysAgo.setDate(NdaysAgo.getDate() - days + 1); // +1 to include today in 'days' count
        NdaysAgo.setHours(0, 0, 0, 0); // Start of that Nth day ago

        const todayEnd = new Date();
        todayEnd.setHours(23,59,59,999);

        const trends = await Invoice.aggregate([
            { $match: { invoiceDate: { $gte: NdaysAgo, $lte: todayEnd } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    dailyRevenue: { $sum: "$totalAmount" },
                    dailySalesCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);
        res.status(200).json({ success: true, data: trends });
    } catch (error) {
        next(error);
    }
};

// --- Product Statistics ---
exports.getLowStockProducts = async (req, res, next) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.find({
            stock: { $lt: threshold, $gt: 0 }, // Stock is greater than 0 but less than threshold
        }).limit(limit).select('title slug stock sku availabilityStatus');
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

exports.getOutOfStockProducts = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.find({
            stock: { $eq: 0 },
            // availabilityStatus: 'Out of Stock' // Or query by your status field
        }).limit(limit).select('title slug stock sku availabilityStatus');
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

exports.getTopSellingProducts = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const sortBy = req.query.sortBy === 'quantity' ? 'totalQuantitySold' : 'totalRevenue'; // Default to revenue
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);

        const matchStage = {};
        if (startDate && endDate) {
            matchStage.invoiceDate = { $gte: startDate, $lte: endDate }; // Filter invoices by date range
        }

        const topProducts = await Invoice.aggregate([
            { $match: matchStage }, // Apply date filter to invoices
            { $unwind: "$items" }, // Deconstruct the items array
            {
                $group: {
                    _id: "$items.product", // Group by product ID
                    totalRevenue: { $sum: "$items.amount" },
                    totalQuantitySold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { [sortBy]: -1 } }, // Sort by specified criteria
            { $limit: limit },
            { // Lookup product details
                $lookup: {
                    from: "products", // Your products collection name
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } }, // Unwind productDetails, keep if product not found
            {
                $project: { // Shape the output
                    productId: "$_id",
                    title: { $ifNull: ["$productDetails.title", "$items.customTitle"] }, // Use product title or custom title
                    slug: "$productDetails.slug",
                    thumbnail: "$productDetails.thumbnail",
                    totalRevenue: 1,
                    totalQuantitySold: 1
                }
            }
        ]);
        res.status(200).json({ success: true, data: topProducts });
    } catch (error) {
        next(error);
    }
};

exports.getTotalInventoryValue = async (req, res, next) => {
    try {
        const inventoryData = await Product.aggregate([
            {
                $group: {
                    _id: null, // Group all products
                    totalValue: { $sum: { $multiply: ["$stock", "$rate"] } }, // Or use "$price"
                    totalItemsInStock: { $sum: "$stock" }
                }
            }
        ]);
        const result = inventoryData.length > 0 ? inventoryData[0] : { _id: null, totalValue: 0, totalItemsInStock: 0 };
        res.status(200).json({ success: true, data: { totalValue: result.totalValue, totalItemsInStock: result.totalItemsInStock } });
    } catch (error) {
        next(error);
    }
};

// --- Customer Statistics ---
exports.getCustomersWithOutstandingPayments = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const customers = await Customer.find({ remainingAmount: { $gt: 0 } })
            .sort({ remainingAmount: -1 })
            .limit(limit)
            .select('fullname email mobileNumber remainingAmount totalPurchasedAmount');
        // To add last due date, you'd iterate and query invoices (can be slow for many)
        // For performance, consider if this is essential for the summary list or a detail view.
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        next(error);
    }
};

exports.getTopCustomersByPurchase = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        // Your Customer model has `totalPurchasedAmount`.
        // If you need to calculate this dynamically for a period from INVOICES:
        if (period || (queryStartDate && queryEndDate)) {
            const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
            const matchStage = {};
            if (startDate && endDate) {
                matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
            }

            const topCustomersByInvoice = await Invoice.aggregate([
                { $match: matchStage },
                // { $match: { status: 'paid' } }, // Optionally, only consider paid invoices
                {
                    $group: {
                        _id: "$buyer", // Group by customer ID
                        periodPurchasedAmount: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { periodPurchasedAmount: -1 } },
                { $limit: limit },
                {
                    $lookup: { // Get customer details
                        from: "customers",
                        localField: "_id",
                        foreignField: "_id",
                        as: "customerDetails"
                    }
                },
                { $unwind: "$customerDetails" },
                {
                    $project: {
                        _id: "$customerDetails._id",
                        fullname: "$customerDetails.fullname",
                        email: "$customerDetails.email",
                        periodPurchasedAmount: 1,
                        // You might want to include their overall totalPurchasedAmount as well
                        totalPurchasedAmountGlobal: "$customerDetails.totalPurchasedAmount"
                    }
                }
            ]);
            return res.status(200).json({ success: true, data: topCustomersByInvoice });
        } else {
            // Use the pre-calculated totalPurchasedAmount on the Customer model
            const customers = await Customer.find({})
                .sort({ totalPurchasedAmount: -1 })
                .limit(limit)
                .select('fullname email totalPurchasedAmount remainingAmount');
            return res.status(200).json({ success: true, data: customers });
        }
    } catch (error) {
        next(error);
    }
};

exports.getNewCustomersCount = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const query = {};
        if (startDate && endDate) {
            query.createdAt = { $gte: startDate, $lte: endDate }; // Assuming Customer model has createdAt
        }
        const count = await Customer.countDocuments(query);
        res.status(200).json({ success: true, data: { newCustomersCount: count } });
    } catch (error) {
        next(error);
    }
};

// --- Payment Statistics ---
exports.getTotalPaymentsReceived = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);

        const matchStage = { status: 'completed' }; // Only count completed payments
        if (startDate && endDate) {
            matchStage.createdAt = { $gte: startDate, $lte: endDate }; // Assuming Payment has createdAt
        }

        const paymentData = await Payment.aggregate([
            { $match: matchStage },
            { $group: { _id: null, totalPaymentsReceived: { $sum: "$amount" } } }
        ]);
        const totalReceived = paymentData.length > 0 ? paymentData[0].totalPaymentsReceived : 0;
        res.status(200).json({ success: true, data: { totalPaymentsReceived: totalReceived } });
    } catch (error) {
        next(error);
    }
};

exports.getPaymentsByMethod = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);

        const matchStage = { status: 'completed' };
        if (startDate && endDate) {
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        const methods = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$paymentMethod", // Group by payment method
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 } // Number of payments for this method
                }
            },
            { $sort: { totalAmount: -1 } } // Sort by highest amount
        ]);
        res.status(200).json({ success: true, data: methods });
    } catch (error) {
        next(error);
    }
};

exports.getFailedPaymentsCount = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const query = { status: 'failed' };
        if (startDate && endDate) {
            query.createdAt = { $gte: startDate, $lte: endDate };
        }
        const count = await Payment.countDocuments(query);
        res.status(200).json({ success: true, data: { failedPaymentsCount: count } });
    } catch (error) {
        next(error);
    }
};


// --- Review Statistics ---
exports.getOverallAverageRating = async (req, res, next) => {
    try {
        // Product schema already has ratingAverage and ratingQuantity.
        // To get a true overall average across ALL products that have ratings:
        const overallStats = await Product.aggregate([
            { $match: { ratingQuantity: { $gt: 0 } } }, // Only products with ratings
            {
                $group: {
                    _id: null,
                    // Weighted average: sum of (ratingAverage * ratingQuantity) / sum of ratingQuantity
                    totalWeightedRatingSum: { $sum: { $multiply: ["$ratingAverage", "$ratingQuantity"] } },
                    totalRatingQuantity: { $sum: "$ratingQuantity" }
                }
            },
            {
                $project: {
                    _id: 0,
                    overallAverage: {
                        $cond: [
                            { $eq: ["$totalRatingQuantity", 0] }, // Avoid division by zero
                            0,
                            { $divide: ["$totalWeightedRatingSum", "$totalRatingQuantity"] }
                        ]
                    },
                    totalReviewsConsidered: "$totalRatingQuantity"
                }
            }
        ]);

        const result = overallStats.length > 0 ? overallStats[0] : { overallAverage: 0, totalReviewsConsidered: 0 };

        // Simpler alternative: Average of review documents directly (might be slightly different if products have no reviews)
        // const reviewStats = await Review.aggregate([
        //     { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
        // ]);
        // const result = reviewStats.length > 0 ? reviewStats[0] : { averageRating: 0, totalReviews: 0 };

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

exports.getRecentReviews = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const reviews = await Review.find({})
            .sort({ createdAt: -1 }) // Latest first
            .limit(limit)
            .populate('user', 'fullname email') // Populate user details
            .populate('product', 'title thumbnail slug'); // Populate product details
        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        next(error);
    }
};



// const sales = await Invoice.aggregate([
//   {
//     $match: { status: { $ne: 'cancelled' } },
//   },
//   {
//     $group: {
//       _id: {
//         month: { $month: '$invoiceDate' },
//         year: { $year: '$invoiceDate' },
//       },
//       totalSales: { $sum: '$totalAmount' },
//     },
//   },
//   {
//     $sort: { '_id.year': 1, '_id.month': 1 },
//   },
// ]);
// const totalSales = await Invoice.aggregate([
//   { $match: { status: { $ne: 'cancelled' } } },
//   { $group: { _id: null, total: { $sum: '$totalAmount' } } },
// ]);
// return { totalSales: totalSales[0]?.total || 0, monthlySales: sales };




// const inventory = await Product.find(
//   { stock: { $lte: 10 } }, // Low stock threshold
//   'title stock availabilityStatus'
// ).sort({ stock: 1 });
// return inventory;


// const topProducts = await Invoice.aggregate([
//   { $unwind: '$items' },
//   {
//     $group: {
//       _id: '$items.product',
//       totalQuantity: { $sum: '$items.quantity' },
//     },
//   },
//   {
//     $lookup: {
//       from: 'products',
//       localField: '_id',
//       foreignField: '_id',
//       as: 'product',
//     },
//   },
//   { $unwind: '$product' },
//   {
//     $project: {
//       title: '$product.title',
//       totalQuantity: 1,
//     },
//   },
//   { $sort: { totalQuantity: -1 } },
//   { $limit: 5 },
// ]);
// return topProducts;



// const customers = await Customer.aggregate([
//   { $match: { remainingAmount: { $gt: 0 } } },
//   {
//     $lookup: {
//       from: 'invoices',
//       localField: 'cart.items.invoiceIds',
//       foreignField: '_id',
//       as: 'invoices',
//     },
//   },
//   {
//     $project: {
//       fullname: 1,
//       remainingAmount: 1,
//       invoices: {
//         $filter: {
//           input: '$invoices',
//           as: 'invoice',
//           cond: { $eq: ['$$invoice.status', 'unpaid'] },
//         },
//       },
//     },
//   },
//   {
//     $project: {
//       fullname: 1,
//       remainingAmount: 1,
//       overdueInvoices: {
//         $map: {
//           input: '$invoices',
//           as: 'invoice',
//           in: {
//             invoiceNumber: '$$invoice.invoiceNumber',
//             dueDate: '$$invoice.dueDate',
//             totalAmount: '$$invoice.totalAmount',
//           },
//         },
//       },
//     },
//   },
//   { $limit: 10 },
// ]);
// return customers;


// const payments = await Payment.find({})
//   .populate('customerId', 'fullname')
//   .select('amount status transactionId createdAt customerId')
//   .sort({ createdAt: -1 })
//   .limit(5);
// return payments;