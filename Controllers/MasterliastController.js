// const Product = require("./../Models/productModel");
// const handleFactory = require("./handleFactory");
// const User = require("../Models/UserModel");
// const Invoice = require("./../Models/invoiceModel");

//  const productMasterList=handleFactory.createList(Product, ['title', 'sku', '_id'])
//  console.log("mmmmmmmmmmmmmmmmmmm",productMasterList)

//  // MasterController.js
// // const handleFactory = require("../handleFactory"); // Import the handleFactory
// // const Product = require("../Models/productModel"); // Import the Product model

// // Controller function to get product master list
// exports.getMasterList = (req, res, next) => {
//   const product = handleFactory.createList(Product, ['title', 'sku', '_id'])(req, res, next);
//   const user = handleFactory.createList(User, ['name', 'email', '_id'])(req, res, next);
  
// };
const handleFactory = require("./handleFactory");
const Product = require("../Models/productModel");
const User = require("../Models/UserModel");
const Seller = require("../Models/Seller");
const catchAsync = require("../Utils/catchAsyncModule");
const Customer = require("../Models/customerModel")
const Payment = require("../Models/paymentModel")
const Invoice = require("../Models/invoiceModel")
exports.getMasterList = catchAsync(async (req, res, next) => { 
    const productPromise = Product.find().select('title sku _id');
    const userPromise = User.find().select('name email _id');
    const sellers = Seller.find().select('name shopname _id')
    const customer = Customer.find().select('fullname phoneNumbers _id')
    const Paymentsdrop = Payment.find().select('customerId customerName phoneNumbers')
    const Invoicedata = Invoice.find().select('invoiceNumber seller buyer')
    const [productsdrop,customersdrop, usersdrop,sellersdrop,Paymentdrop,InvoiceDrop] = await Promise.all([productPromise,customer, userPromise,sellers,Paymentsdrop,Invoicedata]);
    
    res.status(200).json({
        status: 'success',
        data: {
            productsdrop,customersdrop, usersdrop,sellersdrop,Paymentdrop,InvoiceDrop
        },
    });
});

// // // Option 1: Using find() and select()
// exports.getMasterList = catchAsync(async (req, res, next) => {
//     try {
//         const productPromise = Product.find().select('title sku _id');
//         const userPromise = User.find().select('name email _id');

//         const [products, users] = await Promise.all([productPromise, userPromise]);

//         res.status(200).json({
//             status: 'success',
//             data: {
//                 products,
//                 users,
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// });

// // Option 2: Using aggregate()
// exports.getMasterList = catchAsync(async (req, res, next) => {
//     try {
//         const products = await Product.aggregate([
//             {
//                 $project: { title: 1, sku: 1, _id: 1 },
//             },
//         ]);

//         const users = await User.aggregate([
//             {
//                 $project: { name: 1, email: 1, _id: 1 },
//             },
//         ]);

//         res.status(200).json({
//             status: 'success',
//             data: {
//                 products,
//                 users,
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// });