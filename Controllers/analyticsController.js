const catchAsync = require('../Utils/catchAsyncModule');
const Invoice = require('../Models/invoiceModel');
const Product = require('../Models/productModel');
const Customer = require('../Models/customerModel');
const Payment = require('../Models/paymentModel');
const AppError = require('../Utils/appError');

// Get sales performance metrics
exports.getSalesPerformance = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const salesMetrics = await Invoice.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                averageOrderValue: { $avg: "$totalAmount" },
                totalOrders: { $sum: 1 },
                uniqueCustomers: { $addToSet: "$customer" }
            }
        },
        {
            $project: {
                _id: 0,
                totalSales: 1,
                averageOrderValue: 1,
                totalOrders: 1,
                uniqueCustomerCount: { $size: "$uniqueCustomers" }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: salesMetrics[0] || {
            totalSales: 0,
            averageOrderValue: 0,
            totalOrders: 0,
            uniqueCustomerCount: 0
        }
    });
});

// Get customer insights
exports.getCustomerInsights = catchAsync(async (req, res, next) => {
    const customerInsights = await Customer.aggregate([
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "customer",
                as: "orders"
            }
        },
        {
            $project: {
                _id: 1,
                fullname: 1,
                totalOrders: { $size: "$orders" },
                totalSpent: { $sum: "$orders.totalAmount" },
                lastOrderDate: { $max: "$orders.date" }
            }
        },
        {
            $sort: { totalSpent: -1 }
        },
        {
            $limit: 10
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: customerInsights
    });
});

// Get product performance analysis
exports.getProductPerformance = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const productPerformance = await Invoice.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end }
            }
        },
        {
            $unwind: "$items"
        },
        {
            $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                averagePrice: { $avg: "$items.price" },
                orderCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        {
            $unwind: "$productDetails"
        },
        {
            $project: {
                _id: 1,
                name: "$productDetails.title",
                category: "$productDetails.category",
                totalQuantity: 1,
                totalRevenue: 1,
                averagePrice: 1,
                orderCount: 1,
                profitMargin: {
                    $multiply: [
                        { $divide: [{ $subtract: ["$totalRevenue", { $multiply: ["$totalQuantity", "$productDetails.costPrice"] }] }, "$totalRevenue"] },
                        100
                    ]
                }
            }
        },
        {
            $sort: { totalRevenue: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: productPerformance
    });
});

// Get payment collection efficiency
exports.getPaymentCollectionEfficiency = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const paymentEfficiency = await Payment.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: "$status",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "payment",
                as: "invoiceDetails"
            }
        },
        {
            $project: {
                _id: 1,
                totalAmount: 1,
                count: 1,
                averageDaysToPay: {
                    $avg: {
                        $divide: [
                            { $subtract: ["$date", { $arrayElemAt: ["$invoiceDetails.date", 0] }] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: paymentEfficiency
    });
});

// Get inventory turnover rate
exports.getInventoryTurnover = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const inventoryTurnover = await Product.aggregate([
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "items.product",
                as: "sales"
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                category: 1,
                currentStock: 1,
                totalSold: {
                    $sum: {
                        $map: {
                            input: "$sales",
                            as: "sale",
                            in: {
                                $sum: {
                                    $filter: {
                                        input: "$$sale.items",
                                        as: "item",
                                        cond: { $eq: ["$$item.product", "$_id"] }
                                    }
                                }
                            }
                        }
                    }
                },
                averagePrice: {
                    $avg: {
                        $map: {
                            input: "$sales",
                            as: "sale",
                            in: {
                                $avg: {
                                    $filter: {
                                        input: "$$sale.items",
                                        as: "item",
                                        cond: { $eq: ["$$item.product", "$_id"] }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                turnoverRate: {
                    $divide: ["$totalSold", "$currentStock"]
                }
            }
        },
        {
            $sort: { turnoverRate: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: inventoryTurnover
    });
}); 