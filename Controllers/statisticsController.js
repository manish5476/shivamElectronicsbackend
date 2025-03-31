const catchAsync = require('../Utils/catchAsyncModule');
const Product = require('../Models/productModel');
const Invoice = require('../Models/invoiceModel');
const Customer = require('../Models/customerModel');
const Payment = require('../Models/paymentModel');
const AppError = require('../Utils/appError');

// Helper function to get date range for current month
const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startOfMonth, endOfMonth };
};

// Get overall dashboard statistics
exports.getDashboardStats = catchAsync(async (req, res, next) => {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();

    // Get current month's total sales
    const currentMonthSales = await Invoice.aggregate([
        {
            $match: {
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                totalInvoices: { $sum: 1 }
            }
        }
    ]);

    // Get pending payments
    const pendingPayments = await Payment.aggregate([
        {
            $match: {
                status: "pending"
            }
        },
        {
            $group: {
                _id: null,
                totalPendingAmount: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        }
    ]);

    // Get total customers
    const totalCustomers = await Customer.countDocuments();

    // Get total products
    const totalProducts = await Product.countDocuments();

    // Get low stock products (less than 10)
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });

    res.status(200).json({
        status: 'success',
        data: {
            currentMonth: {
                totalSales: currentMonthSales[0]?.totalSales || 0,
                totalInvoices: currentMonthSales[0]?.totalInvoices || 0
            },
            pendingPayments: {
                totalAmount: pendingPayments[0]?.totalPendingAmount || 0,
                count: pendingPayments[0]?.count || 0
            },
            totalCustomers,
            totalProducts,
            lowStockProducts
        }
    });
});

// Get top selling products
exports.getTopSellingProducts = catchAsync(async (req, res, next) => {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();

    const topProducts = await Invoice.aggregate([
        {
            $match: {
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $unwind: "$items"
        },
        {
            $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
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
                totalQuantity: 1,
                totalRevenue: 1
            }
        },
        {
            $sort: { totalQuantity: -1 }
        },
        {
            $limit: 10
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: topProducts
    });
});

// Get customer payment statistics
exports.getCustomerPaymentStats = catchAsync(async (req, res, next) => {
    const pendingPayments = await Payment.aggregate([
        {
            $match: {
                status: "pending"
            }
        },
        {
            $group: {
                _id: "$customerId",
                totalPendingAmount: { $sum: "$amount" },
                paymentCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "customerDetails"
            }
        },
        {
            $unwind: "$customerDetails"
        },
        {
            $project: {
                _id: 1,
                customerName: "$customerDetails.fullname",
                phoneNumber: "$customerDetails.phoneNumbers",
                totalPendingAmount: 1,
                paymentCount: 1
            }
        },
        {
            $sort: { totalPendingAmount: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: pendingPayments
    });
});

// Get monthly sales trend
exports.getMonthlySalesTrend = catchAsync(async (req, res, next) => {
    const { year = new Date().getFullYear() } = req.query;

    const monthlySales = await Invoice.aggregate([
        {
            $match: {
                date: {
                    $gte: new Date(year, 0, 1),
                    $lte: new Date(year, 11, 31)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$date" },
                totalSales: { $sum: "$totalAmount" },
                invoiceCount: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: monthlySales
    });
});

// Get upcoming EMI payments
exports.getUpcomingEMIPayments = catchAsync(async (req, res, next) => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEMIs = await Payment.aggregate([
        {
            $match: {
                status: "pending",
                dueDate: { $gte: today, $lte: nextWeek }
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customerDetails"
            }
        },
        {
            $unwind: "$customerDetails"
        },
        {
            $project: {
                _id: 1,
                customerName: "$customerDetails.fullname",
                phoneNumber: "$customerDetails.phoneNumbers",
                amount: 1,
                dueDate: 1,
                paymentType: 1
            }
        },
        {
            $sort: { dueDate: 1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: upcomingEMIs
    });
});

// Get product inventory status
exports.getInventoryStatus = catchAsync(async (req, res, next) => {
    const inventoryStatus = await Product.aggregate([
        {
            $group: {
                _id: "$category",
                totalProducts: { $sum: 1 },
                lowStockProducts: {
                    $sum: {
                        $cond: [{ $lt: ["$stock", 10] }, 1, 0]
                    }
                },
                totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
            }
        },
        {
            $sort: { totalProducts: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: inventoryStatus
    });
}); 