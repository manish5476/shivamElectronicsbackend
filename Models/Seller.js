// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const Customer = require("./customerModel");  // Assuming there's a customer model
// const Product = require("./productModel");  // Assuming there's a product model

// const sellerSchema = new Schema({
//     name: {
//         type: String,
//         required: [true, 'Seller name is required'],
//         trim: true
//     },
//     prifile: {
//         type: String,
//     },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     shopname: {
//         type: String,
//         required: [true, 'Shop name is required'],
//         trim: true
//     },
//     address: {
//         type: String,
//         required: [true, 'Address is required'],
//         trim: true
//     },
//     gstin: {
//         type: String,
//         required: [true, 'GSTIN is required'],
//         match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
//     },
//     pan: {
//         type: String,
//         required: [true, 'PAN is required'],
//         uppercase: true,
//         match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
//     },
//     contactNumber: {
//         type: String,
//         match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number']
//     },
//     salesHistory: [
//         {
//             customer: {
//                 type: Schema.Types.ObjectId,
//                 ref: 'Customer',
//                 required: true
//             },
//             product: {
//                 type: Schema.Types.ObjectId,
//                 ref: 'Product',
//                 required: true
//             },
//             quantity: {
//                 type: Number,
//                 required: true
//             },
//             salePrice: {
//                 type: Number,
//                 required: true
//             },
//             saleDate: {
//                 type: Date,
//                 default: Date.now
//             },
//             totalAmount: {
//                 type: Number,
//                 required: true
//             }
//         }
//     ]
// }, { timestamps: true });

// const Seller = mongoose.model('Seller', sellerSchema);
// module.exports = Seller;
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Customer = require("./customerModel");  // Assuming there's a customer model
const Product = require("./productModel");  // Assuming there's a product model

const sellerSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Seller name is required'],
        trim: true
    },
    profile: {
        type: String, // Fixed typo from 'prifile' to 'profile'
    },
    status: {
        type: String,
        enum: ["active", "inactive", "pending", "suspended", "blocked"],
        default: "pending",
    },
    shopName: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true
    },
    address: {
        street: { type: String, required: [true, 'Street is required'] },
        city: { type: String, required: [true, 'City is required'] },
        state: { type: String, required: [true, 'State is required'] },
        pincode: {
            type: String,
            required: [true, 'PIN code is required'],
            match: [/^\d{6}$/, 'Invalid Indian PIN code']
        }
    },
    gstin: {
        type: String,
        required: [true, 'GSTIN is required'],
        match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
    },
    pan: {
        type: String,
        required: [true, 'PAN is required'],
        uppercase: true,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
    },
    contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number']
    },
    bankDetails: {
        accountHolderName: {
            type: String,
            required: [true, 'Account holder name is required'],
            trim: true
        },
        accountNumber: {
            type: String,
            required: [true, 'Bank account number is required'],
            match: [/^\d{9,18}$/, 'Invalid bank account number']
        },
        ifscCode: {
            type: String,
            required: [true, 'IFSC code is required'],
            match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code']
        },
        bankName: {
            type: String,
            required: [true, 'Bank name is required'],
            trim: true
        },
        branch: {
            type: String,
            required: [true, 'Bank branch is required'],
            trim: true
        }
    },
    salesHistory: [
        {
            customer: {
                type: Schema.Types.ObjectId,
                ref: 'Customer',
                required: true
            },
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            salePrice: {
                type: Number,
                required: true
            },
            saleDate: {
                type: Date,
                default: Date.now
            },
            totalAmount: {
                type: Number,
                required: true
            }
        }
    ]
}, { timestamps: true });

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;
