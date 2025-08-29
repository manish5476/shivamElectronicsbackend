const Emi = require("../Models/emiModel");
const Invoice = require("../Models/invoiceModel");
const Customer = require("../Models/customerModel");
const Payment = require("../Models/paymentModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");

// ... (createEmiFromInvoice function remains the same) ...
exports.createEmiFromInvoice = catchAsync(async (req, res, next) => {
    const { invoiceId } = req.params;
    const { numberOfInstallments, startDate, downPayment = 0 } = req.body;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

    const invoice = await Invoice.findOne({ _id: invoiceId, ...ownerFilter });
    if (!invoice) {
        return next(
            new AppError(
                "Invoice not found or you do not have permission.",
                404,
            ),
        );
    }

    const amountToFinance = invoice.totalAmount - downPayment;
    const installmentAmount = parseFloat(
        (amountToFinance / numberOfInstallments).toFixed(2),
    );
    const installments = [];

    for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        installments.push({
            installmentNumber: i,
            dueDate,
            amount: installmentAmount,
            status: "pending",
        });
    }

    const emi = await Emi.create({
        owner: req.user._id,
        customer: invoice.buyer,
        invoice: invoiceId,
        totalAmount: invoice.totalAmount,
        numberOfInstallments,
        startDate,
        installments,
    });

    invoice.status = "partially paid";
    await invoice.save();

    res.status(201).json({
        status: "success",
        data: emi,
    });
});

/**
 * @description Records a payment for a specific EMI installment.
 * THIS FUNCTION IS NOW CORRECTED.
 */
exports.recordEmiPayment = catchAsync(async (req, res, next) => {
    const { emiId, installmentId } = req.params;
    const { paymentMethod, transactionId } = req.body;
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };

    const emi = await Emi.findOne({ _id: emiId, ...ownerFilter });
    if (!emi) {
        return next(
            new AppError(
                "EMI plan not found or you do not have permission.",
                404,
            ),
        );
    }

    const installment = emi.installments.id(installmentId);
    if (!installment) {
        return next(
            new AppError("Installment not found in this EMI plan.", 404),
        );
    }
    if (installment.status === "paid") {
        return next(
            new AppError("This installment has already been paid.", 400),
        );
    }

    // 1. Create a corresponding Payment record.
    // This is the crucial new step.
    const payment = await Payment.create({
        owner: req.user._id,
        amount: installment.amount,
        paymentMethod: paymentMethod || "emi", // Default to 'emi'
        status: "completed",
        transactionId,
        customerId: emi.customer,
        description: `EMI payment for Installment #${installment.installmentNumber} of Invoice #${emi.invoice}`,
        emiInfo: {
            emiId: emi._id,
            installmentNumber: installment.installmentNumber,
        },
    });

    // 2. Update the installment status and link the payment.
    installment.status = "paid";
    installment.paymentId = payment._id;
    await emi.save();

    // The post-save hook on the Payment model will automatically
    // trigger the recalculation of the customer's balance.

    res.status(200).json({
        status: "success",
        message: "EMI payment recorded and customer balance updated.",
        data: emi,
    });
});

// ... (getEmiStatusReport function remains the same) ...
exports.getEmiStatusReport = catchAsync(async (req, res, next) => {
    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [dueToday, overdue] = await Promise.all([
        Emi.find({
            ...ownerFilter,
            "installments.status": "pending",
            "installments.dueDate": { $gte: today, $lt: tomorrow },
        }).populate("customer", "fullname"),
        Emi.find({
            ...ownerFilter,
            "installments.status": "pending",
            "installments.dueDate": { $lt: today },
        }).populate("customer", "fullname"),
    ]);

    res.status(200).json({
        status: "success",
        data: {
            dueToday,
            overdue,
        },
    });
});

// /**
//  * @description Creates an EMI plan from an existing invoice.
//  */
// exports.createEmiFromInvoice = catchAsync(async (req, res, next) => {
//     const { invoiceId } = req.params;
//     const { numberOfInstallments, startDate, downPayment = 0 } = req.body;
//     const ownerFilter =
//         req.user.role === "superAdmin" ? {} : { owner: req.user._id };

//     const invoice = await Invoice.findOne({ _id: invoiceId, ...ownerFilter });
//     if (!invoice) {
//         return next(
//             new AppError(
//                 "Invoice not found or you do not have permission.",
//                 404,
//             ),
//         );
//     }

//     const amountToFinance = invoice.totalAmount - downPayment;
//     const installmentAmount = parseFloat(
//         (amountToFinance / numberOfInstallments).toFixed(2),
//     );
//     const installments = [];

//     for (let i = 1; i <= numberOfInstallments; i++) {
//         const dueDate = new Date(startDate);
//         dueDate.setMonth(dueDate.getMonth() + (i - 1));
//         installments.push({
//             installmentNumber: i,
//             dueDate,
//             amount: installmentAmount,
//             status: "pending",
//         });
//     }

//     const emi = await Emi.create({
//         owner: req.user._id,
//         customer: invoice.buyer,
//         invoice: invoiceId,
//         totalAmount: invoice.totalAmount,
//         numberOfInstallments,
//         startDate,
//         installments,
//     });

//     // Update the invoice status to reflect it's now on an EMI plan
//     invoice.status = "partially paid"; // Or a custom 'on-emi' status if you add it
//     await invoice.save();

//     res.status(201).json({
//         status: "success",
//         data: emi,
//     });
// });

// /**
//  * @description Records a payment for a specific EMI installment.
//  */
// exports.recordEmiPayment = catchAsync(async (req, res, next) => {
//     const { emiId, installmentId } = req.params;
//     const { paymentMethod, transactionId } = req.body;
//     const ownerFilter =
//         req.user.role === "superAdmin" ? {} : { owner: req.user._id };

//     const emi = await Emi.findOne({ _id: emiId, ...ownerFilter });
//     if (!emi) {
//         return next(
//             new AppError(
//                 "EMI plan not found or you do not have permission.",
//                 404,
//             ),
//         );
//     }

//     const installment = emi.installments.id(installmentId);
//     if (!installment) {
//         return next(
//             new AppError("Installment not found in this EMI plan.", 404),
//         );
//     }
//     if (installment.status === "paid") {
//         return next(
//             new AppError("This installment has already been paid.", 400),
//         );
//     }

//     // Create a corresponding payment record
//     const payment = await Payment.create({
//         owner: req.user._id,
//         amount: installment.amount,
//         paymentMethod,
//         status: "completed",
//         transactionId,
//         customerId: emi.customer,
//         description: `EMI payment for Installment #${installment.installmentNumber} of Invoice #${emi.invoice}`,
//     });

//     // Update the installment status and link the payment
//     installment.status = "paid";
//     installment.paymentId = payment._id;
//     await emi.save();

//     res.status(200).json({
//         status: "success",
//         data: emi,
//     });
// });

// /**
//  * @description Gets a list of upcoming or overdue EMIs for the dashboard.
//  */
// exports.getEmiStatusReport = catchAsync(async (req, res, next) => {
//     const ownerFilter =
//         req.user.role === "superAdmin" ? {} : { owner: req.user._id };
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     const [dueToday, overdue] = await Promise.all([
//         // EMIs due today
//         Emi.find({
//             ...ownerFilter,
//             "installments.status": "pending",
//             "installments.dueDate": { $gte: today, $lt: tomorrow },
//         }).populate("customer", "fullname"),
//         // Overdue EMIs
//         Emi.find({
//             ...ownerFilter,
//             "installments.status": "pending",
//             "installments.dueDate": { $lt: today },
//         }).populate("customer", "fullname"),
//     ]);

//     res.status(200).json({
//         status: "success",
//         data: {
//             dueToday,
//             overdue,
//         },
//     });
// });
