const handleFactory = require("./handleFactory"); // Assuming handleFactory is updated
const Product = require("../Models/productModel");
const User = require("../Models/UserModel");
const Seller = require("../Models/Seller");
const catchAsync = require("../Utils/catchAsyncModule");
const Customer = require("../Models/customerModel")
const Payment = require("../Models/paymentModel")
const Invoice = require("../Models/invoiceModel")
const AppError = require("../Utils/appError"); // AppError needed for some functions

// Helper function to format response data (unchanged)
const formatResponse = (data, label) => {
    return data.map(item => ({
        id: item._id,
        label: item[label] || item.name || item.title || item.fullname || item.shopname,
        ...item.toObject()
    }));
};

exports.getMasterList = catchAsync(async (req, res, next) => {
    // Determine if the current user is a super admin
    const isSuperAdmin = req.user && req.user.role === 'superAdmin';
    const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

    // Build the base filter. If super admin, it's an empty object (no owner filter).
    // Otherwise, it's an object with the current user's ID as the owner.
    const ownerFilter = isSuperAdmin ? {} : { owner: userId };

    // Queries for models that are owned by users
    const productPromise = Product.find(ownerFilter).select('title sku _id');
    const sellersPromise = Seller.find(ownerFilter).select('name shopname _id');
    const customerPromise = Customer.find(ownerFilter).select('fullname phoneNumbers _id');
    const paymentsDropPromise = Payment.find(ownerFilter).select('customerId customerName phoneNumbers _id'); // Added _id for consistency
    const invoiceDataPromise = Invoice.find(ownerFilter).select('invoiceNumber seller buyer _id'); // Added _id for consistency
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

// Get master list for a specific module
exports.getModuleMasterList = catchAsync(async (req, res, next) => {
    const { module } = req.params;

    // Determine if the current user is a super admin
    const isSuperAdmin = req.user && req.user.role === 'superAdmin';
    const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

    // Build the base filter for owned data
    const ownerFilter = isSuperAdmin ? {} : { owner: userId };

    let query;
    let selectFields;
    let currentModuleOwnerFilter = ownerFilter; // Default to ownerFilter

    switch(module.toLowerCase()) {
        case 'products':
            query = Product;
            selectFields = 'title sku _id category brand price stock';
            break;
        case 'users':
            query = User;
            selectFields = 'name email _id role department';
            currentModuleOwnerFilter = {}; // User data is global, no owner filter
            break;
        case 'sellers':
            query = Seller;
            selectFields = 'name shopname _id email phone';
            break;
        case 'customers':
            query = Customer;
            selectFields = 'fullname phoneNumbers _id mobileNumber email address guaranteerId';
            break;
        case 'payments':
            query = Payment;
            selectFields = 'customerId customerName phoneNumbers amount status';
            break;
        case 'invoices':
            query = Invoice;
            selectFields = 'invoiceNumber seller buyer totalAmount status date';
            break;
        default:
            return next(new AppError('Invalid module specified', 400));
    }

    // Apply the determined filter (ownerFilter or global for Users)
    const data = await query.find(currentModuleOwnerFilter).select(selectFields);
    const formattedData = formatResponse(data,
        module === 'products' ? 'title' :
        module === 'users' ? 'name' :
        module === 'sellers' ? 'shopname' :
        module === 'customers' ? 'fullname' :
        module === 'payments' ? 'customerName' : 'invoiceNumber'
    );

    res.status(200).json({
        status: 'success',
        data: formattedData
    });
});


// Search master list with filters
exports.searchMasterList = catchAsync(async (req, res, next) => {
    const { module, search } = req.query;

    if (!module || !search) {
        return next(new AppError('Module and search term are required', 400));
    }

    // Determine if the current user is a super admin
    const isSuperAdmin = req.user && req.user.role === 'superAdmin';
    const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

    // Build the base filter for owned data
    const ownerFilter = isSuperAdmin ? {} : { owner: userId };

    let query;
    let searchFields;
    let currentModuleOwnerFilter = ownerFilter; // Default to ownerFilter

    switch(module.toLowerCase()) {
        case 'products':
            query = Product;
            searchFields = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } }
                ]
            };
            break;
        case 'users':
            query = User;
            searchFields = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
            currentModuleOwnerFilter = {}; // User data is global, no owner filter
            break;
        case 'sellers':
            query = Seller;
            searchFields = {
                $or: [
                    { shopname: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ]
            };
            break;
        case 'customers':
            query = Customer;
            searchFields = {
                $or: [
                    { fullname: { $regex: search, $options: 'i' } },
                    { 'phoneNumbers.number': { $regex: search, $options: 'i' } } // Search nested field
                ]
            };
            break;
        case 'payments':
            query = Payment;
            searchFields = {
                $or: [
                    { customerName: { $regex: search, $options: 'i' } },
                    { 'phoneNumbers.number': { $regex: search, $options: 'i' } } // Search nested field
                ]
            };
            break;
        case 'invoices':
            query = Invoice;
            searchFields = {
                $or: [
                    { invoiceNumber: { $regex: search, $options: 'i' } },
                    { 'seller.name': { $regex: search, $options: 'i' } }, // Assuming seller is populated or embedded
                    { 'buyer.fullname': { $regex: search, $options: 'i' } } // Assuming buyer is populated or embedded
                ]
            };
            break;
        default:
            return next(new AppError('Invalid module specified', 400));
    }

    // Combine the owner filter with the search fields
    const finalFilter = { ...currentModuleOwnerFilter, ...searchFields };

    const data = await query.find(finalFilter);
    const formattedData = formatResponse(data,
        module === 'products' ? 'title' :
        module === 'users' ? 'name' :
        module === 'sellers' ? 'shopname' :
        module === 'customers' ? 'fullname' :
        module === 'payments' ? 'customerName' : 'invoiceNumber'
    );

    res.status(200).json({
        status: 'success',
        data: formattedData
    });
});

// const handleFactory = require("./handleFactory");
// const Product = require("../Models/productModel");
// const User = require("../Models/UserModel");
// const Seller = require("../Models/Seller");
// const catchAsync = require("../Utils/catchAsyncModule");
// const Customer = require("../Models/customerModel");
// const Payment = require("../Models/paymentModel");
// const Invoice = require("../Models/invoiceModel");
// const AppError = require("../Utils/appError");

// // Helper function to format response data
// const formatResponse = (data, label) => {
//     return data.map(item => ({
//         id: item._id,
//         label: item[label] || item.name || item.title || item.fullname || item.shopname,
//         ...item.toObject()
//     }));
// };

// exports.getMasterList = catchAsync(async (req, res, next) => {
//     // Get all data in parallel for better performance
//     const [ products, users, sellers, customers, payments, invoices] = await Promise.all([
//         Product.find().select('title sku _id category brand price stock'),
//         User.find().select('name email _id role department'),
//         Seller.find().select('name shopname _id email phone'),
//         Customer.find().select('fullname phoneNumbers _id email address guaranteerId'),
//         Payment.find().select('customerId customerName phoneNumbers amount status'),
//         Invoice.find().select('invoiceNumber seller buyer totalAmount status date')
//     ]);

//     // Format each dataset with consistent structure
//     const formattedData = {
//         products: formatResponse(products, 'title'),
//         users: formatResponse(users, 'name'),
//         sellers: formatResponse(sellers, 'shopname'),
//         customers: formatResponse(customers, 'fullname'),
//         payments: formatResponse(payments, 'customerName'),
//         invoices: formatResponse(invoices, 'invoiceNumber')
//     };

//     res.status(200).json({
//         status: 'success',
//         data: formattedData
//     });
// });

// // Get master list for a specific module
// exports.getModuleMasterList = catchAsync(async (req, res, next) => {
//     const { module } = req.params;
    
//     let query;
//     let selectFields;
    
//     switch(module.toLowerCase()) {
//         case 'products':
//             query = Product;
//             selectFields = 'title sku _id category brand price stock';
//             break;
//         case 'users':
//             query = User;
//             selectFields = 'name email _id role department';
//             break;
//         case 'sellers':
//             query = Seller;
//             selectFields = 'name shopname _id email phone';
//             break;
//         case 'customers':
//             query = Customer;
//             selectFields = 'fullname phoneNumbers _id mobileNumber email address guaranteerId';
//             break;
//         case 'payments':
//             query = Payment;
//             selectFields = 'customerId customerName phoneNumbers amount status';
//             break;
//         case 'invoices':
//             query = Invoice;
//             selectFields = 'invoiceNumber seller buyer totalAmount status date';
//             break;
//         default:
//             return next(new AppError('Invalid module specified', 400));
//     }

//     const data = await query.find().select(selectFields);
//     const formattedData = formatResponse(data, 
//         module === 'products' ? 'title' :
//         module === 'users' ? 'name' :
//         module === 'sellers' ? 'shopname' :
//         module === 'customers' ? 'fullname' :
//         module === 'payments' ? 'customerName' : 'invoiceNumber'
//     );

//     res.status(200).json({
//         status: 'success',
//         data: formattedData
//     });
// });

// // Search master list with filters
// exports.searchMasterList = catchAsync(async (req, res, next) => {
//     const { module, search } = req.query;
    
//     if (!module || !search) {
//         return next(new AppError('Module and search term are required', 400));
//     }

//     let query;
//     let searchFields;
    
//     switch(module.toLowerCase()) {
//         case 'products':
//             query = Product;
//             searchFields = { 
//                 $or: [
//                     { title: { $regex: search, $options: 'i' } },
//                     { sku: { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         case 'users':
//             query = User;
//             searchFields = { 
//                 $or: [
//                     { name: { $regex: search, $options: 'i' } },
//                     { email: { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         case 'sellers':
//             query = Seller;
//             searchFields = { 
//                 $or: [
//                     { shopname: { $regex: search, $options: 'i' } },
//                     { name: { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         case 'customers':
//             query = Customer;
//             searchFields = { 
//                 $or: [
//                     { fullname: { $regex: search, $options: 'i' } },
//                     { phoneNumbers: { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         case 'payments':
//             query = Payment;
//             searchFields = { 
//                 $or: [
//                     { customerName: { $regex: search, $options: 'i' } },
//                     { phoneNumbers: { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         case 'invoices':
//             query = Invoice;
//             searchFields = { 
//                 $or: [
//                     { invoiceNumber: { $regex: search, $options: 'i' } },
//                     { 'seller.name': { $regex: search, $options: 'i' } }
//                 ]
//             };
//             break;
//         default:
//             return next(new AppError('Invalid module specified', 400));
//     }

//     const data = await query.find(searchFields);
//     const formattedData = formatResponse(data, 
//         module === 'products' ? 'title' :
//         module === 'users' ? 'name' :
//         module === 'sellers' ? 'shopname' :
//         module === 'customers' ? 'fullname' :
//         module === 'payments' ? 'customerName' : 'invoiceNumber'
//     );

//     res.status(200).json({
//         status: 'success',
//         data: formattedData
//     });
// }); 