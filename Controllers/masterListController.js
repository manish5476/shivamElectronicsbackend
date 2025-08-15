const Product = require("../Models/productModel");
const User = require("../Models/UserModel");
const Seller = require("../Models/Seller");
const Customer = require("../Models/customerModel");
const Payment = require("../Models/paymentModel");
const Invoice = require("../Models/invoiceModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");

// --- 1. Centralized Module Configuration (DRY Principle) ---
const moduleConfig = {
    products: {
        Model: Product,
        selectFields: 'title sku _id category brand price stock',
        labelField: 'title',
        searchFields: ['title', 'sku'],
    },
    users: {
        Model: User,
        selectFields: 'name email _id role department',
        labelField: 'name',
        searchFields: ['name', 'email'],
        isGlobal: true, // This module ignores the owner filter
    },
    sellers: {
        Model: Seller,
        selectFields: 'name shopname _id email phone',
        labelField: 'shopname',
        searchFields: ['shopname', 'name'],
    },
    customers: {
        Model: Customer,
        selectFields: 'fullname phoneNumbers _id mobileNumber email address',
        labelField: 'fullname',
        searchFields: ['fullname', 'phoneNumbers.number'],
    },
    payments: {
        Model: Payment,
        selectFields: 'customerId customerName phoneNumbers amount status',
        labelField: 'customerName',
        searchFields: ['customerName', 'phoneNumbers.number'],
    },
    invoices: {
        Model: Invoice,
        selectFields: 'invoiceNumber seller buyer totalAmount status date',
        labelField: 'invoiceNumber',
        searchFields: ['invoiceNumber', 'seller.name', 'buyer.fullname'],
    }
};

const formatResponse = (data, labelField) => {
    return data.map(item => ({
        id: item._id,
        label: item[labelField],
        ...item // <-- Simply spread the plain object
    }));
};

// Helper to get the owner filter based on user role
const getOwnerFilter = (user) => {
    return user && user.role === 'superAdmin' ? {} : { owner: user._id };
};


// --- 2. Controller Functions (Now much cleaner) ---
// This function was already well-optimized with Promise.all, no changes needed.
exports.getMasterList = catchAsync(async (req, res, next) => {
    const ownerFilter = getOwnerFilter(req.user);
    const [products, customers, users, sellers, payments, invoices] = await Promise.all([
        Product.find(ownerFilter).select('title sku _id').lean(),
        Customer.find(ownerFilter).select('fullname phoneNumbers _id').lean(),
        User.find().select('name email _id').lean(), // Users are global
        Seller.find(ownerFilter).select('name shopname _id').lean(),
        Payment.find(ownerFilter).select('customerId customerName _id').lean(),
        Invoice.find(ownerFilter).select('invoiceNumber seller buyer _id').lean(),
    ]);

    res.status(200).json({
        status: 'success',
        data: { products, customers, users, sellers, payments, invoices },
    });
});

exports.getModuleMasterList = catchAsync(async (req, res, next) => {
    const { module } = req.params;
    const config = moduleConfig[module.toLowerCase()];

    if (!config) {
        return next(new AppError('Invalid module specified', 400));
    }
    const ownerFilter = config.isGlobal ? {} : getOwnerFilter(req.user);
    const data = await config.Model.find(ownerFilter).select(config.selectFields).lean();
    const formattedData = formatResponse(data, config.labelField);
    res.status(200).json({ status: 'success', data: formattedData });
});


exports.searchMasterList = catchAsync(async (req, res, next) => {
    const { module, search } = req.query;
    if (!module || !search) {
        return next(new AppError('Module and search term are required', 400));
    }
    const config = moduleConfig[module.toLowerCase()];
    if (!config) {
        return next(new AppError('Invalid module specified', 400));
    }
    const ownerFilter = config.isGlobal ? {} : getOwnerFilter(req.user);
    // Build the search query dynamically
    const searchFilter = {
        $or: config.searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
        }))
    };
    const finalFilter = { ...ownerFilter, ...searchFilter };
    const data = await config.Model.find(finalFilter).lean();
    const formattedData = formatResponse(data, config.labelField);
    res.status(200).json({ status: 'success', data: formattedData });
});

/**
 * Fetches a master list for a specific module from the API.
 * @param {string} moduleName - The name of the module to fetch (e.g., 'products', 'customers').
 * @returns {Promise<Array>} A promise that resolves to an array of data, or an empty array on error.
 */
async function getModuleList(moduleName) {
    try {
        // Construct the URL dynamically based on the module name
        const response = await fetch(`/api/v1/master/${moduleName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer YOUR_JWT_TOKEN`, // Make sure to include your auth token
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (!response.ok) {
            // Throw an error with the message from the server
            throw new Error(result.message || `Failed to fetch ${moduleName}.`);
        }

        // On success, return the data array
        return result.data;

    } catch (error) {
        console.error(`Error fetching module list for "${moduleName}":`, error);
        // Return an empty array to prevent the UI from crashing
        return [];
    }
}



// const handleFactory = require("./handleFactory"); // Assuming handleFactory is updated
// const Product = require("../Models/productModel");
// const User = require("../Models/UserModel");
// const Seller = require("../Models/Seller");
// const catchAsync = require("../Utils/catchAsyncModule");
// const Customer = require("../Models/customerModel")
// const Payment = require("../Models/paymentModel")
// const Invoice = require("../Models/invoiceModel")
// const AppError = require("../Utils/appError"); // AppError needed for some functions

// // Helper function to format response data (unchanged)
// const formatResponse = (data, label) => {
//     return data.map(item => ({
//         id: item._id,
//         label: item[label] || item.name || item.title || item.fullname || item.shopname,
//         ...item.toObject()
//     }));
// };

// exports.getMasterList = catchAsync(async (req, res, next) => {
//     // Determine if the current user is a super admin
//     const isSuperAdmin = req.user && req.user.role === 'superAdmin';
//     const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

//     // Build the base filter. If super admin, it's an empty object (no owner filter).
//     // Otherwise, it's an object with the current user's ID as the owner.
//     const ownerFilter = isSuperAdmin ? {} : { owner: userId };

//     // Queries for models that are owned by users
//     const productPromise = Product.find(ownerFilter).select('title sku _id');
//     const sellersPromise = Seller.find(ownerFilter).select('name shopname _id');
//     const customerPromise = Customer.find(ownerFilter).select('fullname phoneNumbers _id');
//     const paymentsDropPromise = Payment.find(ownerFilter).select('customerId customerName phoneNumbers _id'); // Added _id for consistency
//     const invoiceDataPromise = Invoice.find(ownerFilter).select('invoiceNumber seller buyer _id'); // Added _id for consistency
//     const userPromise = User.find().select('name email _id');


//     const [productsdrop, customersdrop, usersdrop, sellersdrop, Paymentdrop, InvoiceDrop] = await Promise.all([
//         productPromise,
//         customerPromise,
//         userPromise,
//         sellersPromise,
//         paymentsDropPromise,
//         invoiceDataPromise
//     ]);

//     res.status(200).json({
//         status: 'success',
//         statusCode: 200, // Add statusCode for consistency
//         data: {
//             productsdrop,
//             customersdrop,
//             usersdrop,
//             sellersdrop,
//             Paymentdrop,
//             InvoiceDrop
//         },
//     });
// });

// // Get master list for a specific module
// exports.getModuleMasterList = catchAsync(async (req, res, next) => {
//     const { module } = req.params;

//     // Determine if the current user is a super admin
//     const isSuperAdmin = req.user && req.user.role === 'superAdmin';
//     const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

//     // Build the base filter for owned data
//     const ownerFilter = isSuperAdmin ? {} : { owner: userId };

//     let query;
//     let selectFields;
//     let currentModuleOwnerFilter = ownerFilter; // Default to ownerFilter

//     switch(module.toLowerCase()) {
//         case 'products':
//             query = Product;
//             selectFields = 'title sku _id category brand price stock';
//             break;
//         case 'users':
//             query = User;
//             selectFields = 'name email _id role department';
//             currentModuleOwnerFilter = {}; // User data is global, no owner filter
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

//     // Apply the determined filter (ownerFilter or global for Users)
//     const data = await query.find(currentModuleOwnerFilter).select(selectFields);
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

//     // Determine if the current user is a super admin
//     const isSuperAdmin = req.user && req.user.role === 'superAdmin';
//     const userId = req.user ? req.user._id : null; // Get the authenticated user's ID

//     // Build the base filter for owned data
//     const ownerFilter = isSuperAdmin ? {} : { owner: userId };

//     let query;
//     let searchFields;
//     let currentModuleOwnerFilter = ownerFilter; // Default to ownerFilter

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
//             currentModuleOwnerFilter = {}; // User data is global, no owner filter
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
//                     { 'phoneNumbers.number': { $regex: search, $options: 'i' } } // Search nested field
//                 ]
//             };
//             break;
//         case 'payments':
//             query = Payment;
//             searchFields = {
//                 $or: [
//                     { customerName: { $regex: search, $options: 'i' } },
//                     { 'phoneNumbers.number': { $regex: search, $options: 'i' } } // Search nested field
//                 ]
//             };
//             break;
//         case 'invoices':
//             query = Invoice;
//             searchFields = {
//                 $or: [
//                     { invoiceNumber: { $regex: search, $options: 'i' } },
//                     { 'seller.name': { $regex: search, $options: 'i' } }, // Assuming seller is populated or embedded
//                     { 'buyer.fullname': { $regex: search, $options: 'i' } } // Assuming buyer is populated or embedded
//                 ]
//             };
//             break;
//         default:
//             return next(new AppError('Invalid module specified', 400));
//     }

//     // Combine the owner filter with the search fields
//     const finalFilter = { ...currentModuleOwnerFilter, ...searchFields };

//     const data = await query.find(finalFilter);
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
