const catchAsync = require("../Utils/catchAsyncModule");
const Invoice = require("../Models/invoiceModel");
const Customer = require("../Models/customerModel");
const AppError = require("../Utils/appError");

const getOwnerFilter = (req) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === "superAdmin";
    return isSuperAdmin ? {} : { owner: userId };
};

exports.getSalesForecast = catchAsync(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req);

    const monthlySales = await Invoice.aggregate([
        { $match: { ...ownerFilter } },
        {
            $group: {
                _id: {
                    year: { $year: "$invoiceDate" },
                    month: { $month: "$invoiceDate" },
                },
                totalSales: { $sum: "$totalAmount" },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    if (monthlySales.length < 2) {
        return next(
            new AppError(
                "Not enough historical data to generate a forecast.",
                400,
            ),
        );
    }

    const averageMonthlySales =
        monthlySales.reduce((sum, current) => sum + current.totalSales, 0) /
        monthlySales.length;
    const nextMonthForecast = averageMonthlySales * 1.1; // Simple forecast: 10% growth

    res.status(200).json({
        status: "success",
        data: {
            historicalData: monthlySales,
            forecast: {
                nextMonth: nextMonthForecast.toFixed(2),
            },
        },
    });
});

exports.getCustomerSegments = catchAsync(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req);
    const thirtyDaysAgo = new Date(
        new Date().setDate(new Date().getDate() - 30),
    );

    const customerSegments = await Customer.aggregate([
        { $match: ownerFilter },
        {
            $lookup: {
                from: "invoices",
                localField: "_id",
                foreignField: "buyer",
                as: "invoices",
            },
        },
        {
            $project: {
                fullname: 1,
                email: 1,
                totalSpent: { $sum: "$invoices.totalAmount" },
                lastPurchaseDate: { $max: "$invoices.invoiceDate" },
            },
        },
        {
            $facet: {
                highValue: [
                    { $match: { totalSpent: { $gte: 1000 } } }, // Example threshold
                    { $sort: { totalSpent: -1 } },
                ],
                recentCustomers: [
                    { $match: { lastPurchaseDate: { $gte: thirtyDaysAgo } } },
                    { $sort: { lastPurchaseDate: -1 } },
                ],
                atRisk: [
                    {
                        $match: {
                            lastPurchaseDate: {
                                $lt: new Date(
                                    new Date().setMonth(
                                        new Date().getMonth() - 6,
                                    ),
                                ),
                            },
                        },
                    }, // No purchase in 6 months
                    { $sort: { lastPurchaseDate: 1 } },
                ],
            },
        },
    ]);

    res.status(200).json({
        status: "success",
        data: customerSegments[0],
    });
});
