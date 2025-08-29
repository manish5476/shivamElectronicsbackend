const ReportSubscription = require("../Models/reportSubscriptionModel");
const catchAsync = require("../Utils/catchAsyncModule");
const factory = require("./handleFactory");

exports.subscribeToReport = catchAsync(async (req, res, next) => {
    const { reportType, schedule, recipients } = req.body;

    const subscription = await ReportSubscription.create({
        owner: req.user._id,
        reportType,
        schedule,
        recipients,
    });

    res.status(201).json({
        status: "success",
        data: subscription,
    });
});

exports.getMySubscriptions = factory.getAll(ReportSubscription);
exports.unsubscribeFromReport = factory.delete(ReportSubscription);
