const Invoice = require('../../Models/invoiceModel');
const Product = require('../../Models/productModel');
const Customer = require('../../Models/customerModel');
const Payment = require('../../Models/paymentModel');
const Review = require('../../Models/ReviewModel');
const catchAsync = require('../../Utils/catchAsyncModule');
const AppError = require('../../Utils/appError');
const { getDateRange, getISOWeek, getFirstDayOfISOWeek } = require('./dashboard.utils');

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

// exports.getTopCustomersByPurchase = async (req, res, next) => {
//     try {
//         const limit = parseInt(req.query.limit) || 5;
//         const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
//         // Your Customer model has `totalPurchasedAmount`.
//         // If you need to calculate this dynamically for a period from INVOICES:
//         if (period || (queryStartDate && queryEndDate)) {
//             const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
//             const matchStage = {};
//             if (startDate && endDate) {
//                 matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
//             }

//             const topCustomersByInvoice = await Invoice.aggregate([
//                 { $match: matchStage },
//                 // { $match: { status: 'paid' } }, // Optionally, only consider paid invoices
//                 {
//                     $group: {
//                         _id: "$buyer", // Group by customer ID
//                         periodPurchasedAmount: { $sum: "$totalAmount" }
//                     }
//                 },
//                 { $sort: { periodPurchasedAmount: -1 } },
//                 { $limit: limit },
//                 {
//                     $lookup: { // Get customer details
//                         from: "customers",
//                         localField: "_id",
//                         foreignField: "_id",
//                         as: "customerDetails"
//                     }
//                 },
//                 { $unwind: "$customerDetails" },
//                 {
//                     $project: {
//                         _id: "$customerDetails._id",
//                         fullname: "$customerDetails.fullname",
//                         email: "$customerDetails.email",
//                         periodPurchasedAmount: 1,
//                         cart:"$customerDetails.cart",
//                         totalPurchasedAmountGlobal: "$customerDetails.totalPurchasedAmount"
//                     }
//                 }
//             ]);
//             return res.status(200).json({ success: true, data: topCustomersByInvoice });
//         } else {
//             // Use the pre-calculated totalPurchasedAmount on the Customer model
//             const customers = await Customer.find({})
//                 .sort({ totalPurchasedAmount: -1 })
//                 .limit(limit)
//                 .select('fullname email totalPurchasedAmount remainingAmount');
//             return res.status(200).json({ success: true, data: customers });
//         }
//     } catch (error) {
//         next(error);
//     }
// };
exports.getTopCustomersByPurchase = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;

        if (period || (queryStartDate && queryEndDate)) {
            const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
            const matchStage = {};
            if (startDate && endDate) {
                matchStage.invoiceDate = { $gte: startDate, $lte: endDate };
            }

            const topCustomersByInvoice = await Invoice.aggregate([
                // Stage 1: Match invoices within the date range
                { $match: matchStage },
                // Stage 2: Group by customer to calculate total purchase amount for the period
                {
                    $group: {
                        _id: "$buyer", // Group by customer ID
                        periodPurchasedAmount: { $sum: "$totalAmount" }
                    }
                },
                // Stage 3: Sort by the highest spending customers
                { $sort: { periodPurchasedAmount: -1 } },
                { $limit: limit },
                // Stage 4: Lookup the full customer details
                {
                    $lookup: {
                        from: "customers",
                        localField: "_id",
                        foreignField: "_id",
                        as: "customerDetails"
                    }
                },
                { $unwind: "$customerDetails" },
                // Stage 5: Unwind the cart items to process each one
                { $unwind: { path: "$customerDetails.cart.items", preserveNullAndEmptyArrays: true } },
                // Stage 6: *** NEW - Lookup the product details for each cart item ***
                {
                    $lookup: {
                        from: "products",
                        localField: "customerDetails.cart.items.productId",
                        foreignField: "_id",
                        as: "customerDetails.cart.items.productInfo"
                    }
                },
                { $unwind: { path: "$customerDetails.cart.items.productInfo", preserveNullAndEmptyArrays: true } },
                // Stage 7: Group back to reconstruct the customer object with populated cart items
                {
                    $group: {
                        _id: "$customerDetails._id",
                        fullname: { $first: "$customerDetails.fullname" },
                        email: { $first: "$customerDetails.email" },
                        periodPurchasedAmount: { $first: "$periodPurchasedAmount" },
                        totalPurchasedAmountGlobal: { $first: "$customerDetails.totalPurchasedAmount" },
                        cartItems: {
                            $push: {
                                // Rebuild the item with populated product details
                                _id: "$customerDetails.cart.items._id",
                                invoiceIds: "$customerDetails.cart.items.invoiceIds",
                                // Embed the product details directly
                                productId: {
                                    _id: "$customerDetails.cart.items.productInfo._id",
                                    title: "$customerDetails.cart.items.productInfo.title",
                                    price: "$customerDetails.cart.items.productInfo.price",
                                    sku: "$customerDetails.cart.items.productInfo.sku",
                                    thumbnail: "$customerDetails.cart.items.productInfo.thumbnail"
                                }
                            }
                        }
                    }
                },
                // Final Stage: Reshape the output to match the expected format
                {
                    $project: {
                        _id: 1,
                        fullname: 1,
                        email: 1,
                        periodPurchasedAmount: 1,
                        totalPurchasedAmountGlobal: 1,
                        cart: {
                            items: "$cartItems"
                        }
                    }
                },
                 { $sort: { periodPurchasedAmount: -1 } }, // Sort again after regrouping
            ]);
            return res.status(200).json({ success: true, data: topCustomersByInvoice });
        } else {
            // Fallback for when no date period is specified
            const customers = await Customer.find({})
                .sort({ totalPurchasedAmount: -1 })
                .limit(limit)
                .select('fullname email totalPurchasedAmount remainingAmount cart')
                .populate('cart.items.productId', 'title price sku thumbnail'); // Use populate for the simpler case
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