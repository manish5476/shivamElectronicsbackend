const PurchaseOrder = require("../Models/purchaseOrderModel");
const Product = require("../Models/productModel");
const Seller = require("../Models/Seller");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const factory = require("./handleFactory");
const mongoose = require("mongoose");

exports.createPurchaseOrder = catchAsync(async (req, res, next) => {
    const { seller, items } = req.body;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

    // 1. Validate Seller
    const sellerExists = await Seller.findOne({ _id: seller, ...ownerFilter });
    if (!sellerExists) {
        return next(
            new AppError(
                "Seller not found or you do not have permission.",
                404,
            ),
        );
    }

    // 2. Calculate total amount
    const totalAmount = items.reduce(
        (sum, item) => sum + item.purchasePrice * item.quantity,
        0,
    );

    // 3. Create the Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
        owner: req.user._id,
        seller,
        items,
        totalAmount,
    });

    // 4. Update the Seller's record
    await Seller.findByIdAndUpdate(seller, {
        $push: { purchaseOrders: purchaseOrder._id },
    });

    res.status(201).json({
        status: "success",
        data: purchaseOrder,
    });
});

exports.receiveStock = catchAsync(async (req, res, next) => {
    const { purchaseOrderId } = req.params;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

    const purchaseOrder = await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        ...ownerFilter,
    });

    if (!purchaseOrder) {
        return next(
            new AppError(
                "Purchase Order not found or you do not have permission.",
                404,
            ),
        );
    }
    if (purchaseOrder.status === "completed") {
        return next(
            new AppError(
                "This order has already been completed and stock has been updated.",
                400,
            ),
        );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Update stock for each product in the order
        for (const item of purchaseOrder.items) {
            await Product.findByIdAndUpdate(
                item.product,
                {
                    $inc: { stock: item.quantity },
                },
                { session },
            );
        }

        // Mark the order as completed
        purchaseOrder.status = "completed";
        purchaseOrder.receivedDate = new Date();
        await purchaseOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            message: "Stock has been successfully updated.",
            data: purchaseOrder,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(
            new AppError("Failed to update stock. Please try again.", 500),
        );
    }
});

exports.getAllPurchaseOrders = factory.getAll(PurchaseOrder);
exports.getPurchaseOrder = factory.getOne(PurchaseOrder);
