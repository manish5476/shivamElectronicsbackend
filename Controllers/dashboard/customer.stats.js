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
                        cart:"$customerDetails.cart",
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