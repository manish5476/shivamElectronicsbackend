const handleFactory = require("./handleFactory"); // Assuming handleFactory is updated
const Product = require("../Models/productModel");
const User = require("../Models/UserModel");
const Seller = require("../Models/Seller");
const catchAsync = require("../Utils/catchAsyncModule");
const Customer = require("../Models/customerModel")
const Payment = require("../Models/paymentModel")
const Invoice = require("../Models/invoiceModel")

exports.getMasterList = catchAsync(async (req, res, next) => {
    // Determine if the current user is a super admin
    const isSuperAdmin = req.user && req.user.role === 'superAdmin';
    const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

    // Build the base filter. If super admin, it's an empty object (no owner filter).
    // Otherwise, it's an object with the current user's ID as the owner.
    const ownerFilter = isSuperAdmin ? {} : { owner: userId };
    const productPromise = Product.find(ownerFilter).select('title sku _id');
    const sellersPromise = Seller.find(ownerFilter).select('name shopname _id');
    const customerPromise = Customer.find(ownerFilter).select('fullname phoneNumbers _id');
    const paymentsDropPromise = Payment.find(ownerFilter).select('customerId customerName phoneNumbers _id'); // Added _id for consistency
    const invoiceDataPromise = Invoice.find(ownerFilter).select('invoiceNumber seller buyer _id'); // Added _id for consistency

    // User data is typically global, so no owner filter applied here
    const userPromise = User.find().select('name email _id');


    const [productsdrop, customersdrop, usersdrop, sellersdrop, Paymentdrop, InvoiceDrop] = await Promise.all([
        productPromise,
        customerPromise,
        userPromise,
        sellersPromise,
        paymentsDropPromise,
        invoiceDataPromise
    ]);

    res.status(200).json({
        status: 'success',
        statusCode: 200, // Add statusCode for consistency
        data: {
            productsdrop,
            customersdrop,
            usersdrop,
            sellersdrop,
            Paymentdrop,
            InvoiceDrop
        },
    });
});

// const handleFactory = require("./handleFactory");
// const Product = require("../Models/productModel");
// const User = require("../Models/UserModel");
// const Seller = require("../Models/Seller");
// const catchAsync = require("../Utils/catchAsyncModule");
// const Customer = require("../Models/customerModel")
// const Payment = require("../Models/paymentModel")
// const Invoice = require("../Models/invoiceModel")

// exports.getMasterList = catchAsync(async (req, res, next) => {
//     const productPromise = Product.find().select('title sku _id');
//     const userPromise = User.find().select('name email _id');
//     const sellers = Seller.find().select('name shopname _id')
//     const customer = Customer.find().select('fullname phoneNumbers _id')
//     const Paymentsdrop = Payment.find().select('customerId customerName phoneNumbers')
//     const Invoicedata = Invoice.find().select('invoiceNumber seller buyer')
//     const [productsdrop, customersdrop, usersdrop, sellersdrop, Paymentdrop, InvoiceDrop] = await Promise.all([productPromise, customer, userPromise, sellers, Paymentsdrop, Invoicedata]);

//     res.status(200).json({
//         status: 'success',
//         data: {
//             productsdrop, customersdrop, usersdrop, sellersdrop, Paymentdrop, InvoiceDrop
//         },
//     });
// });
