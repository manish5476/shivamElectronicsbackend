const catchAsync = require('../Utils/catchAsyncModule');
const Invoice = require('../Models/invoiceModel');
const Product = require('../Models/productModel');
const Customer = require('../Models/customerModel');
const Payment = require('../Models/paymentModel');
const AppError = require('../Utils/appError');

// It's assumed that all routes using these handlers are protected by authController.protect middleware,
// which populates req.user with the authenticated user's details (including role and _id).

// Helper function to get the owner filter
const getOwnerFilter = (req) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';
    return isSuperAdmin ? {} : { owner: userId };
};

// Get sales performance metrics
exports.getSalesPerformance = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the owner filter
    const ownerFilter = getOwnerFilter(req);

    const salesMetrics = await Invoice.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter first
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                averageOrderValue: { $avg: "$totalAmount" },
                totalOrders: { $sum: 1 },
                uniqueCustomers: { $addToSet: "$customer" } // Assuming 'customer' in Invoice is the customer's _id
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
    // Get the owner filter
    const ownerFilter = getOwnerFilter(req);

    const customerInsights = await Customer.aggregate([
        {
            $match: ownerFilter // Apply owner filter to customers
        },
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "customer",
                as: "orders"
            }
        },
        // Filter orders within the lookup result if they also need to be owned by the user
        // This stage is crucial if the 'orders' array might contain invoices from other owners
        // and you only want to sum invoices belonging to the current user.
        {
            $addFields: {
                orders: {
                    $filter: {
                        input: "$orders",
                        as: "order",
                        cond: {
                            $eq: ["$$order.owner", req.user._id]
                        }
                    }
                }
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

    // Get the owner filter
    const ownerFilter = getOwnerFilter(req);

    const productPerformance = await Invoice.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter first
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
        // If productDetails also need to be filtered by owner (for non-super-admins)
        // This is important if a product could exist in multiple owners' inventories.
        // If product SKU is globally unique but products are owned, this helps.
        {
            $match: {
                // Ensure the joined product also belongs to the current user, unless super admin
                "productDetails.owner": ownerFilter.owner || "$productDetails.owner"
            }
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

    // Get the owner filter
    const ownerFilter = getOwnerFilter(req);

    const paymentEfficiency = await Payment.aggregate([
        {
            $match: {
                ...ownerFilter, // Apply owner filter first
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
        // The original $lookup to 'invoices' using _id as localField for Payment status
        // and foreignField as "payment" is likely incorrect. A payment usually refers to an invoice,
        // not the other way around where invoice 'payment' field would be the _id of a Payment document.
        // If 'invoiceDetails' is truly needed, ensure the relationship is correct in your schema.
        // For dashboard purposes, often summing up payments by status is sufficient.
        // Removing the incorrect lookup for now. If you need details from invoices,
        // you'd typically have a 'paymentId' field on Invoice or a 'invoiceId' on Payment.
        // I've commented out the original $lookup and $project for averageDaysToPay as they seem problematic.
        // If Payment does have a 'date' field you want to calculate average days from, ensure that's what it means.
        // For 'averageDaysToPay', you'd need the payment date and the corresponding invoice date.
        /*
        {
            $lookup: {
                from: "invoices",
                localField: "_id", // This would be the Payment._id
                foreignField: "payment", // This assumes Invoice has a 'payment' field storing Payment._id
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
        */
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

    // Get the owner filter
    const ownerFilter = getOwnerFilter(req);

    const inventoryTurnover = await Product.aggregate([
        {
            $match: ownerFilter // Apply owner filter to products
        },
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "items.product",
                as: "sales"
            }
        },
        // Filter the 'sales' (invoices) to only include those relevant to the current owner
        // This is crucial if products and invoices are both multi-tenanted.
        {
            $addFields: {
                sales: {
                    $filter: {
                        input: "$sales",
                        as: "sale",
                        cond: {
                            $and: [
                                { $eq: ["$$sale.owner", req.user._id] }, // Check invoice owner
                                { $gte: ["$$sale.date", start] },       // Filter by date range
                                { $lte: ["$$sale.date", end] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                category: 1,
                currentStock: 1,
                // Calculate total sold quantity for THIS product from filtered sales
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
                                        cond: { $eq: ["$$item.product", "$_id"] },
                                        limit: 1 // Only sum the quantity for this specific product in the array
                                    }
                                }.quantity
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
                                }.price
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                turnoverRate: {
                    $cond: {
                        if: { $ne: ["$currentStock", 0] },
                        then: { $divide: ["$totalSold", "$currentStock"] },
                        else: 0 // Avoid division by zero
                    }
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

// const catchAsync = require('../Utils/catchAsyncModule');
// const Invoice = require('../Models/invoiceModel');
// const Product = require('../Models/productModel');
// const Customer = require('../Models/customerModel');
// const Payment = require('../Models/paymentModel');
// const AppError = require('../Utils/appError');

// // Get sales performance metrics
// exports.getSalesPerformance = catchAsync(async (req, res, next) => {
//     const { startDate, endDate } = req.query;
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const salesMetrics = await Invoice.aggregate([
//         {
//             $match: {
//                 date: { $gte: start, $lte: end }
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 totalSales: { $sum: "$totalAmount" },
//                 averageOrderValue: { $avg: "$totalAmount" },
//                 totalOrders: { $sum: 1 },
//                 uniqueCustomers: { $addToSet: "$customer" }
//             }
//         },
//         {
//             $project: {
//                 _id: 0,
//                 totalSales: 1,
//                 averageOrderValue: 1,
//                 totalOrders: 1,
//                 uniqueCustomerCount: { $size: "$uniqueCustomers" }
//             }
//         }
//     ]);

//     res.status(200).json({
//         status: 'success',
//         data: salesMetrics[0] || {
//             totalSales: 0,
//             averageOrderValue: 0,
//             totalOrders: 0,
//             uniqueCustomerCount: 0
//         }
//     });
// });

// // Get customer insights
// exports.getCustomerInsights = catchAsync(async (req, res, next) => {
//     const customerInsights = await Customer.aggregate([
//         {
//             $lookup: {
//                 from: "invoices",
//                 localField: "_id",
//                 foreignField: "customer",
//                 as: "orders"
//             }
//         },
//         {
//             $project: {
//                 _id: 1,
//                 fullname: 1,
//                 totalOrders: { $size: "$orders" },
//                 totalSpent: { $sum: "$orders.totalAmount" },
//                 lastOrderDate: { $max: "$orders.date" }
//             }
//         },
//         {
//             $sort: { totalSpent: -1 }
//         },
//         {
//             $limit: 10
//         }
//     ]);

//     res.status(200).json({
//         status: 'success',
//         data: customerInsights
//     });
// });

// // Get product performance analysis
// exports.getProductPerformance = catchAsync(async (req, res, next) => {
//     const { startDate, endDate } = req.query;
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const productPerformance = await Invoice.aggregate([
//         {
//             $match: {
//                 date: { $gte: start, $lte: end }
//             }
//         },
//         {
//             $unwind: "$items"
//         },
//         {
//             $group: {
//                 _id: "$items.product",
//                 totalQuantity: { $sum: "$items.quantity" },
//                 totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
//                 averagePrice: { $avg: "$items.price" },
//                 orderCount: { $sum: 1 }
//             }
//         },
//         {
//             $lookup: {
//                 from: "products",
//                 localField: "_id",
//                 foreignField: "_id",
//                 as: "productDetails"
//             }
//         },
//         {
//             $unwind: "$productDetails"
//         },
//         {
//             $project: {
//                 _id: 1,
//                 name: "$productDetails.title",
//                 category: "$productDetails.category",
//                 totalQuantity: 1,
//                 totalRevenue: 1,
//                 averagePrice: 1,
//                 orderCount: 1,
//                 profitMargin: {
//                     $multiply: [
//                         { $divide: [{ $subtract: ["$totalRevenue", { $multiply: ["$totalQuantity", "$productDetails.costPrice"] }] }, "$totalRevenue"] },
//                         100
//                     ]
//                 }
//             }
//         },
//         {
//             $sort: { totalRevenue: -1 }
//         }
//     ]);

//     res.status(200).json({
//         status: 'success',
//         data: productPerformance
//     });
// });

// // Get payment collection efficiency
// exports.getPaymentCollectionEfficiency = catchAsync(async (req, res, next) => {
//     const { startDate, endDate } = req.query;
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const paymentEfficiency = await Payment.aggregate([
//         {
//             $match: {
//                 date: { $gte: start, $lte: end }
//             }
//         },
//         {
//             $group: {
//                 _id: "$status",
//                 totalAmount: { $sum: "$amount" },
//                 count: { $sum: 1 }
//             }
//         },
//         {
//             $lookup: {
//                 from: "invoices",
//                 localField: "_id",
//                 foreignField: "payment",
//                 as: "invoiceDetails"
//             }
//         },
//         {
//             $project: {
//                 _id: 1,
//                 totalAmount: 1,
//                 count: 1,
//                 averageDaysToPay: {
//                     $avg: {
//                         $divide: [
//                             { $subtract: ["$date", { $arrayElemAt: ["$invoiceDetails.date", 0] }] },
//                             1000 * 60 * 60 * 24
//                         ]
//                     }
//                 }
//             }
//         }
//     ]);

//     res.status(200).json({
//         status: 'success',
//         data: paymentEfficiency
//     });
// });

// // Get inventory turnover rate
// exports.getInventoryTurnover = catchAsync(async (req, res, next) => {
//     const { startDate, endDate } = req.query;
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const inventoryTurnover = await Product.aggregate([
//         {
//             $lookup: {
//                 from: "invoices",
//                 localField: "_id",
//                 foreignField: "items.product",
//                 as: "sales"
//             }
//         },
//         {
//             $project: {
//                 _id: 1,
//                 title: 1,
//                 category: 1,
//                 currentStock: 1,
//                 totalSold: {
//                     $sum: {
//                         $map: {
//                             input: "$sales",
//                             as: "sale",
//                             in: {
//                                 $sum: {
//                                     $filter: {
//                                         input: "$$sale.items",
//                                         as: "item",
//                                         cond: { $eq: ["$$item.product", "$_id"] }
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 },
//                 averagePrice: {
//                     $avg: {
//                         $map: {
//                             input: "$sales",
//                             as: "sale",
//                             in: {
//                                 $avg: {
//                                     $filter: {
//                                         input: "$$sale.items",
//                                         as: "item",
//                                         cond: { $eq: ["$$item.product", "$_id"] }
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         },
//         {
//             $addFields: {
//                 turnoverRate: {
//                     $divide: ["$totalSold", "$currentStock"]
//                 }
//             }
//         },
//         {
//             $sort: { turnoverRate: -1 }
//         }
//     ]);

//     res.status(200).json({
//         status: 'success',
//         data: inventoryTurnover
//     });
// }); 