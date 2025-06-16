

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
const fs = require('fs').promises; // For async file operations
const path = require('path');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');

exports.getSystemLogs = catchAsync(async (req, res, next) => {
    const logFileName = req.query.file || 'combined.log'; // Allow selection of log file
    const logFilePath = path.join(__dirname, '..', 'logs', logFileName);
    try {
        await fs.access(logFilePath, fs.constants.R_OK);
        let logsContent = await fs.readFile(logFilePath, 'utf8');
        const logLines = logsContent.split('\n').filter(line => line.trim() !== '');
        const parsedLogs = logLines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return { raw: line, error: 'JSON parsing failed' };
            }
        });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedLogs = parsedLogs.slice(startIndex, endIndex);

        res.status(200).json({
            status: 'success',
            results: paginatedLogs.length,
            totalLogs: parsedLogs.length,
            page,
            limit,
            data: paginatedLogs,
        });

    } catch (error) {
        if (error.code === 'ENOENT') { // File not found
            return next(new AppError(`Log file ${logFileName} not found.`, 404));
        }
        console.error("Error reading log file:", error);
        return next(new AppError('Failed to retrieve logs.', 500));
    }
});



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
    let startDate;
    let endDate;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (queryStartDate && queryEndDate) {
        startDate = new Date(queryStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(queryEndDate);
        endDate.setHours(23, 59, 999);
        if (endDate > today) {
            endDate = new Date(today);
        }

        return { startDate, endDate };
    }

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
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last_month':
            const lastMonthDate = new Date(today);
            lastMonthDate.setMonth(today.getMonth() - 1);
            startDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        default:
            startDate = null;
            endDate = null;
            break;
    }

    if (endDate && endDate > today && period !== 'last_month') {
        endDate = new Date(today);
    }

    return { startDate, endDate };
};

// New Controller Methods
exports.getSalesDataForCharts = async (req, res, next) => {
    try {
        const { year } = req.query;
        const currentYear = new Date().getFullYear();
        const targetYear = year ? parseInt(year) : currentYear;

        // Validate year
        if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
            });
        }

        const startDate = new Date(targetYear, 0, 1); // January 1st
        startDate.setHours(0, 0, 0, 0);
        const endDate = targetYear === currentYear ? new Date() : new Date(targetYear, 11, 31); // Up to today or Dec 31
        endDate.setHours(23, 59, 59, 999);

        // Fetch all sales data for the year in one query
        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $project: {
                    year: { $year: '$invoiceDate' },
                    month: { $month: '$invoiceDate' },
                    day: { $dayOfMonth: '$invoiceDate' },
                    week: { $isoWeek: '$invoiceDate' },
                    totalAmount: '$totalAmount',
                },
            },
            {
                $facet: {
                    yearly: [
                        {
                            $group: {
                                _id: '$month',
                                totalRevenue: { $sum: '$totalAmount' },
                                salesCount: { $sum: 1 },
                            },
                        },
                        {
                            $sort: { '_id': 1 },
                        },
                        {
                            $project: {
                                _id: 0,
                                month: '$_id',
                                totalRevenue: 1,
                                salesCount: 1,
                            },
                        },
                    ],
                    monthly: [
                        {
                            $group: {
                                _id: { month: '$month', day: '$day' },
                                totalRevenue: { $sum: '$totalAmount' },
                                salesCount: { $sum: 1 },
                            },
                        },
                        {
                            $sort: { '_id.month': 1, '_id.day': 1 },
                        },
                        {
                            $group: {
                                _id: '$_id.month',
                                dailySales: {
                                    $push: {
                                        day: '$_id.day',
                                        totalRevenue: '$totalRevenue',
                                        salesCount: '$salesCount',
                                    },
                                },
                            },
                        },
                        {
                            $sort: { '_id': 1 },
                        },
                        {
                            $project: {
                                _id: 0,
                                month: '$_id',
                                dailySales: 1,
                            },
                        },
                    ],
                    weekly: [
                        {
                            $group: {
                                _id: { week: '$week', year: '$year', month: '$month', day: '$day' },
                                totalRevenue: { $sum: '$totalAmount' },
                                salesCount: { $sum: 1 },
                            },
                        },
                        {
                            $sort: { '_id.week': 1, '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                        },
                        {
                            $group: {
                                _id: '$_id.week',
                                dailySales: {
                                    $push: {
                                        date: {
                                            $dateFromParts: {
                                                year: '$_id.year',
                                                month: '$_id.month',
                                                day: '$_id.day',
                                            },
                                        },
                                        totalRevenue: '$totalRevenue',
                                        salesCount: '$salesCount',
                                    },
                                },
                            },
                        },
                        {
                            $sort: { '_id': 1 },
                        },
                        {
                            $project: {
                                _id: 0,
                                week: '$_id',
                                dailySales: 1,
                            },
                        },
                    ],
                },
            },
        ]);

        // Process Yearly Data (12 months)
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const yearlySales = months.map((month) => {
            const found = salesData[0].yearly.find((data) => data.month === month);
            return found || { month, totalRevenue: 0, salesCount: 0 };
        });

        // Process Monthly Data (fill missing days)
        const monthlySales = months.map((month) => {
            const foundMonth = salesData[0].monthly.find((data) => data.month === month);
            const daysInMonth = new Date(targetYear, month, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const dailySales = days.map((day) => {
                const foundDay = foundMonth?.dailySales.find((d) => d.day === day);
                return foundDay || { day, totalRevenue: 0, salesCount: 0 };
            });
            return { month, dailySales };
        });

        // Process Weekly Data (fill missing days)
        const weeksInYear = targetYear === currentYear ? getISOWeek(new Date()) : 53;
        const weeklySales = Array.from({ length: weeksInYear }, (_, i) => i + 1).map((week) => {
            const foundWeek = salesData[0].weekly.find((data) => data.week === week);
            const weekStart = getFirstDayOfISOWeek(week, targetYear);
            const dailySales = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                if (date > endDate) break; // Stop at current date
                const dateStr = date.toISOString().split('T')[0];
                const foundDay = foundWeek?.dailySales.find(
                    (d) => d.date.toISOString().split('T')[0] === dateStr
                );
                dailySales.push({
                    date: dateStr,
                    totalRevenue: foundDay ? foundDay.totalRevenue : 0,
                    salesCount: foundDay ? foundDay.salesCount : 0,
                });
            }
            return { week, dailySales };
        });

        res.status(200).json({
            success: true,
            data: {
                year: targetYear,
                yearlySales: { monthlySales: yearlySales },
                monthlySales,
                weeklySales,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- Yearly Sales by Month ---
exports.getYearlySalesByMonth = async (req, res, next) => {
    try {
        const { year } = req.query;
        const currentYear = new Date().getFullYear();
        const targetYear = year ? parseInt(year) : currentYear;

        // Validate year
        if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
            });
        }

        const startDate = new Date(targetYear, 0, 1); // January 1st
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetYear, 11, 31); // December 31st
        endDate.setHours(23, 59, 59, 999);

        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: { month: { $month: '$invoiceDate' } },
                    totalRevenue: { $sum: '$totalAmount' },
                    salesCount: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.month': 1 },
            },
            {
                $project: {
                    _id: 0,
                    month: '$_id.month',
                    totalRevenue: 1,
                    salesCount: 1,
                },
            },
        ]);

        // Fill in missing months with zero values
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const filledData = months.map((month) => {
            const found = salesData.find((data) => data.month === month);
            return found || { month, totalRevenue: 0, salesCount: 0 };
        });

        res.status(200).json({
            success: true,
            data: {
                year: targetYear,
                monthlySales: filledData,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- Monthly Sales by Day ---
exports.getMonthlySalesByDay = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        console.log(req.query)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const targetYear = year ? parseInt(year) : currentYear;
        const targetMonth = month ? parseInt(month) : currentMonth;

        // Validate inputs
        if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
            });
        }
        if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
            return res.status(400).json({
                success: false,
                message: `Invalid month: ${month}. Must be between 1 and 12.`,
            });
        }
        // Check if month is in the future
        const now = new Date();
        if (targetYear === currentYear && targetMonth > currentMonth) {
            return res.status(400).json({
                success: false,
                message: `Cannot fetch sales for future month: ${targetMonth}/${targetYear}.`,
            });
        }

        const startDate = new Date(targetYear, targetMonth - 1, 1); // First day of month
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: { day: { $dayOfMonth: '$invoiceDate' } },
                    totalRevenue: { $sum: '$totalAmount' },
                    salesCount: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.day': 1 },
            },
            {
                $project: {
                    _id: 0,
                    day: '$_id.day',
                    totalRevenue: 1,
                    salesCount: 1,
                },
            },
        ]);

        // Fill in missing days with zero values
        const daysInMonth = endDate.getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const filledData = days.map((day) => {
            const found = salesData.find((data) => data.day === day);
            return found || { day, totalRevenue: 0, salesCount: 0 };
        });

        res.status(200).json({
            success: true,
            data: {
                year: targetYear,
                month: targetMonth,
                dailySales: filledData,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- Weekly Sales by Day ---
exports.getWeeklySalesByDay = async (req, res, next) => {
    try {
        const { year, week } = req.query;
        const currentYear = new Date().getFullYear();
        const currentWeek = getISOWeek(new Date());
        const targetYear = year ? parseInt(year) : currentYear;
        const targetWeek = week ? parseInt(week) : currentWeek;

        // Validate inputs
        if (isNaN(targetYear) || targetYear < 1900 || targetYear > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Invalid year: ${year}. Must be between 1900 and ${currentYear}.`,
            });
        }
        if (isNaN(targetWeek) || targetWeek < 1 || targetWeek > 53) {
            return res.status(400).json({
                success: false,
                message: `Invalid week: ${week}. Must be between 1 and 53.`,
            });
        }
        // Check if week is in the future
        if (targetYear === currentYear && targetWeek > currentWeek) {
            return res.status(400).json({
                success: false,
                message: `Cannot fetch sales for future week: Week ${targetWeek} of ${targetYear}.`,
            });
        }

        // Calculate start and end dates for the week (Monday to Sunday)
        const startDate = getFirstDayOfISOWeek(targetWeek, targetYear);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of Sunday
        endDate.setHours(23, 59, 59, 999);

        const salesData = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: { day: { $dayOfMonth: '$invoiceDate' }, month: { $month: '$invoiceDate' }, year: { $year: '$invoiceDate' } },
                    totalRevenue: { $sum: '$totalAmount' },
                    salesCount: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day',
                        },
                    },
                    totalRevenue: 1,
                    salesCount: 1,
                },
            },
        ]);

        // Fill in missing days with zero values
        const filledData = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const found = salesData.find((data) => data.date.toISOString().split('T')[0] === dateStr);
            filledData.push({
                date: dateStr,
                totalRevenue: found ? found.totalRevenue : 0,
                salesCount: found ? found.salesCount : 0,
            });
        }

        res.status(200).json({
            success: true,
            data: {
                year: targetYear,
                week: targetWeek,
                dailySales: filledData,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to get ISO week number
function getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Nearest Thursday
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Helper function to get the first day (Monday) of an ISO week
function getFirstDayOfISOWeek(week, year) {
    const firstJan = new Date(year, 0, 1);
    const dayOfWeek = firstJan.getDay();
    const firstMonday = new Date(year, 0, 1 + (dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek));
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

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
            Product.find({ stock: { $lt: lowStockThreshold, $gte: 0 } }).limit(listLimits).select('title stock sku category brand rate thumbnail'),
            // Top Selling Products (by revenue)
            Invoice.aggregate([
                { $match: dateMatchCriteria(startDate, endDate) },
                { $unwind: "$items" },
                { $group: { _id: "$items.product", totalRevenue: { $sum: "$items.amount" }, totalQuantitySold: { $sum: "$items.quantity" } } },
                { $sort: { totalRevenue: -1 } }, { $limit: listLimits },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
                { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
                { $project: { productId: "$_id", title: { $ifNull: ["$productDetails.title", "$items.customTitle"] }, totalRevenue: 1, totalQuantitySold: 1 } }
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
        todayEnd.setHours(23, 59, 59, 999);

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