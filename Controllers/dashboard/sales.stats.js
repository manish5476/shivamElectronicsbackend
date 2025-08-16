const Invoice = require('../../Models/invoiceModel');
const Product = require('../../Models/productModel');
const Customer = require('../../Models/customerModel');
const Payment = require('../../Models/paymentModel');
const Review = require('../../Models/ReviewModel');
const fs = require('fs').promises; // For async file operations
const path = require('path');
const catchAsync = require('../../Utils/catchAsyncModule');
const AppError = require('../../Utils/appError');
const { getDateRange, getISOWeek, getFirstDayOfISOWeek } = require('./dashboard.utils');

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