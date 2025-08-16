const catchAsync = require('../../Utils/catchAsyncModule');
const Invoice = require('../../Models/invoiceModel');
const Product = require('../../Models/productModel');
const Customer = require('../../Models/customerModel');
const Payment = require('../../Models/paymentModel');
const Review = require('../../Models/ReviewModel');
const { getDateRange, getISOWeek, getFirstDayOfISOWeek } = require('./dashboard.utils');

exports.getTotalPaymentsReceived = async (req, res, next) => {
    try {
        const { period, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        const { startDate, endDate } = getDateRange(period, queryStartDate, queryEndDate);
        const matchStage = { status: 'completed' };
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