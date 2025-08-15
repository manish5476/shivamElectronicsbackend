const Product = require('../../Models/productModel');
const Review = require('../../Models/ReviewModel');
const Invoice = require('../../Models/invoiceModel');
const Customer = require('../../Models/customerModel');
const Payment = require('../../Models/paymentModel');
const catchAsync = require('../../Utils/catchAsyncModule');
const { getDateRange, getISOWeek, getFirstDayOfISOWeek } = require('./dashboard.utils');


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