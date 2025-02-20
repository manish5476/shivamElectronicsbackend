
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Invoice = require('./invoiceModel')
const Product=require('./productModel')
const cartItemSchema = new Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product",  // Link to the Product schema
        required: true 
    },
    invoiceIds: [{  // Array of ObjectIds - **IS IT DEFINED LIKE THIS?**
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice"
    }],
});

const customerSchema = new Schema({
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ["active", "inactive", "pending", "suspended", "blocked"],
        default: "pending",
    },
    profileImg:{type:String},
    email: { type: String, unique: true, match: /.+\@.+\..+/ },
    fullname: { type: String, required: true },
    phoneNumbers: [{
        number: { type: String, required: true },
        type: { type: String, enum: ["home", "mobile", "work"], required: true },
        primary: { type: Boolean, default: false }
    }],
    addresses: [{
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
        isDefault: { type: Boolean, default: false }
    }],
    cart: {
        items: { type: [cartItemSchema], default: [] }  // Default empty array
    },
    guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
    totalPurchasedAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
    paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    metadata: { type: Map, of: Schema.Types.Mixed },
    
}, 
{ timestamps: true });



module.exports = mongoose.model('Customer', customerSchema);

customerSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'cart.items.productId',
        select: 'title finalPrice thumbnail -_id', // Exclude _id if not needed
    })
        .populate({
            path: 'cart.items.invoiceIds',
            select: 'invoiceNumber totalAmount -_id',
        })
        .populate({
            path: 'paymentHistory',
            select: 'amount status -_id',
        });
    next();
});
// customerSchema.pre(/^find/, function (next) {
//     this.populate({
//         path: 'cart.items.productId',
//         select: 'title finalPrice thumbnail description', // Match your Product schema
//     })
//         .populate({
//             path: 'cart.items.invoiceIds',
//             select: 'invoiceNumber totalAmount invoiceDate status', // Match your Invoice schema
//         })
//         .populate({
//             path: 'paymentHistory',
//             select: 'amount status createdAt transactionId', // Match your Payment schema
//         });
//     next();
// });

// Ensure findById triggers the hook
customerSchema.pre('findOne', function (next) {
    this.populate({
        path: 'cart.items.productId',
        select: 'title finalPrice thumbnail description',
    })
        .populate({
            path: 'cart.items.invoiceIds',
            select: 'invoiceNumber totalAmount invoiceDate status',
        })
        .populate({
            path: 'paymentHistory',
            select: 'amount status createdAt transactionId',
        });
    next();
});
// Pre-find Hook to populate cart items, products, and invoices
// customerSchema.pre(/^find/, async function(next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price",  // Only select necessary fields from Product
//     })
//     .populate({
//         path: "cart.items.invoiceIds",
//         select: "amount date",  // Select only necessary fields from Invoice
//     })
//     .populate("paymentHistory");  // Populate paymentHistory if needed
//     next();
// });
// customerSchema.pre(/^find/, function (next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price", // Populate product data
//     })
//         .populate({
//             path: "cart.items.invoiceIds",
//             select: "amount date", // Populate invoice data
//         })
//         .populate("paymentHistory");
//     next();
// });

// Post-save Hook to recalculate the total and remaining amounts
customerSchema.post('save', async function (doc) {
    try {
        await calculateTotalPurchasedAmount(doc._id);
        await calculateRemainingAmount(doc._id);
    } catch (error) {
        console.error("Error during post-save calculations:", error);
    }
});

// Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
customerSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        try {
            await calculateTotalPurchasedAmount(doc._id);
            await calculateRemainingAmount(doc._id);
        } catch (error) {
            console.error("Error during post-update calculations:", error);
        }
    }
});



// Function to calculate the total purchased amount
async function calculateTotalPurchasedAmount(customerId) {
    try {
        const customer = await Customer.findById(customerId).populate({
            path: "cart.items.invoiceIds",
            select: "amount",
        });

        if (!customer) {
            console.error("Customer not found");
            return;
        }

        const totalAmount = customer.cart.items.reduce((acc, item) => {
            if (item.invoiceIds) {
                item.invoiceIds.forEach(invoice => {
                    if (invoice && invoice.amount) {
                        acc += invoice.amount;
                    }
                });
            }
            return acc;
        }, 0);

        customer.totalPurchasedAmount = totalAmount;
        await customer.save();
    } catch (error) {
        console.error("Error calculating total purchased amount:", error);
    }
}

// Function to calculate the remaining amount
async function calculateRemainingAmount(customerId) {
    try {
        const customer = await Customer.findById(customerId).populate('paymentHistory');
        if (!customer) {
            console.log("customer not found");
            return;
        }

        let totalPaid = 0;
        if (customer.paymentHistory) {
            customer.paymentHistory.forEach(payment => {
                totalPaid += payment.amount;
            });
        }

        customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
        await customer.save();
    } catch (err) {
        console.log("Error in calculating remaining amount", err);
    }
}


/**const mongoose = require('mongoose');
const { Schema } = mongoose;
const Product =require('./productModel');
const Invoice=require('./invoiceModel')
const cartItemSchema = new Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Product, 
        required: true
    },
    invoiceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Invoice  // Link to the Invoice schema
    }],
});

const customerSchema = new Schema({
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ["active", "inactive", "pending", "suspended", "blocked"],
        default: "pending",
    },
    profileImg: { type: String },
    email: { type: String, unique: true, match: /.+\@.+\..+/ },
    fullname: { type: String, required: true },
    phoneNumbers: [{
        number: { type: String, required: true },
        type: { type: String, enum: ["home", "mobile", "work"], required: true },
        primary: { type: Boolean, default: false }
    }],
    addresses: [{
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
        isDefault: { type: Boolean, default: false }
    }],
    cart: {
        items: { type: [cartItemSchema], default: [] }  // Default empty array
    },
    guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
    totalPurchasedAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
    paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    metadata: { type: Map, of: Schema.Types.Mixed },

},
    { timestamps: true });



module.exports = mongoose.model('Customer', customerSchema);

// Pre-find Hook to populate cart items, products, and invoices
// customerSchema.pre(/^find/, async function (next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price",  // Only select necessary fields from Product
//     })
//         .populate({
//             path: "cart.items.invoiceIds",
//             select: "amount date",  // Select only necessary fields from Invoice
//         })
//         .populate("paymentHistory");  // Populate paymentHistory if needed
//     next();
// });
customerSchema.pre(/^find/, async function (next) {
    console.log("--- Populating Query ---");
    console.log("Query filters:", this.getFilter());

    this.populate({
        path: "cart.items.productId",
        select: "name price _id",
    })
        .populate({
            path: "cart.items.invoiceIds",
            select: "amount date",
        })
        .populate("paymentHistory")
        .then(() => {
            console.log("--- Population Attempted Successfully ---");
            next(); // Call next() in .then() to proceed after population setup
        })
        .catch(err => {
            console.error("Population Error:", err);
            next(err); // Pass any population errors to next(err) for error handling
        });

    console.log("--- Population Setup Initiated (next() will be called later) ---");
    // Do NOT call next() here directly outside the .then()/.catch()
});

// Post-save Hook to recalculate the total and remaining amounts
customerSchema.post('save', async function (doc) {
    try {
        await calculateTotalPurchasedAmount(doc._id);
        await calculateRemainingAmount(doc._id);
    } catch (error) {
        console.error("Error during post-save calculations:", error);
    }
});

// Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
customerSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        try {
            await calculateTotalPurchasedAmount(doc._id);
            await calculateRemainingAmount(doc._id);
        } catch (error) {
            console.error("Error during post-update calculations:", error);
        }
    }
});



// Function to calculate the total purchased amount
async function calculateTotalPurchasedAmount(customerId) {
    try {
        // Corrected line: use lowercase 'customer'
        const customer = await mongoose.model('Customer').findById(customerId).populate({
            path: "cart.items.invoiceIds",
            select: "amount",
        });

        if (!customer) {
            console.error("Customer not found");
            return;
        }

        const totalAmount = customer.cart.items.reduce((acc, item) => {
            if (item.invoiceIds) {
                item.invoiceIds.forEach(invoice => {
                    console.log("Invoice in totalPurchasedAmount:", invoice); // Log invoice object
                    if (invoice && invoice.amount) {
                        acc += invoice.amount;
                    }
                });
            }
            return acc;
        }, 0);

        customer.totalPurchasedAmount = totalAmount;
        await customer.save();
    } catch (error) {
        console.error("Error calculating total purchased amount:", error);
    }
}

// Function to calculate the remaining amount
async function calculateRemainingAmount(customerId) {
    try {
        // Corrected line: use lowercase 'customer'
        const customer = await mongoose.model('Customer').findById(customerId).populate('paymentHistory');
        if (!customer) {
            console.log("customer not found");
            return;
        }

        let totalPaid = 0;
        if (customer.paymentHistory) {
            customer.paymentHistory.forEach(payment => {
                totalPaid += payment.amount;
            });
        }

        customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
        await customer.save();
    } catch (err) {
        console.log("Error in calculating remaining amount", err);
    }
}

// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const cartItemSchema = new Schema({
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product",  // Link to the Product schema
//         required: true 
//     },
//     invoiceIds: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Invoice"  // Link to the Invoice schema
//     }],
// });

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     profileImg:{type:String},
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     cart: {
//         items: { type: [cartItemSchema], default: [] }  // Default empty array
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number, default: 0 },  // Default to 0 if not set
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
    
// }, 
// { timestamps: true });



// module.exports = mongoose.model('Customer', customerSchema);

// // Pre-find Hook to populate cart items, products, and invoices
// customerSchema.pre(/^find/, async function(next) {
//     this.populate({
//         path: "cart.items.productId",
//         select: "name price",  // Only select necessary fields from Product
//     })
//     .populate({
//         path: "cart.items.invoiceIds",
//         select: "amount date",  // Select only necessary fields from Invoice
//     })
//     .populate("paymentHistory");  // Populate paymentHistory if needed
//     next();
// });

// // Post-save Hook to recalculate the total and remaining amounts
// customerSchema.post('save', async function (doc) {
//     try {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     } catch (error) {
//         console.error("Error during post-save calculations:", error);
//     }
// });

// // Post-findOneAndUpdate Hook to recalculate the total and remaining amounts after update
// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         try {
//             await calculateTotalPurchasedAmount(doc._id);
//             await calculateRemainingAmount(doc._id);
//         } catch (error) {
//             console.error("Error during post-update calculations:", error);
//         }
//     }
// });



// // Function to calculate the total purchased amount
// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate({
//             path: "cart.items.invoiceIds",
//             select: "amount",
//         });

//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         const totalAmount = customer.cart.items.reduce((acc, item) => {
//             if (item.invoiceIds) {
//                 item.invoiceIds.forEach(invoice => {
//                     console.log("Invoice in totalPurchasedAmount:", invoice); // Log invoice object
//                     if (invoice && invoice.amount) {
//                         acc += invoice.amount;
//                     }
//                 });
//             }
//             return acc;
//         }, 0);
        
//         // const totalAmount = customer.cart.items.reduce((acc, item) => {
//         //     if (item.invoiceIds) {
//         //         item.invoiceIds.forEach(invoice => {
//         //             if (invoice && invoice.amount) {
//         //                 acc += invoice.amount;
//         //             }
//         //         });
//         //     }
//         //     return acc;
//         // }, 0);

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// // Function to calculate the remaining amount
// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }

//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error in calculating remaining amount", err);
//     }
// }



// const cartItemSchema = new Schema({
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product",  
//         required: true 
//     },
//     invoiceIds: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Invoice"  
//     }],
// });

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     cart: {
//         items: [cartItemSchema]  // Include the cart items with product and invoice references
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number },
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, { timestamps: true });


// customerSchema.pre(/^find/, async function(next) {
//     this.populate({
//         path: "cart.items.productId",   
//         select: "-__v",                  
//     })
//     .populate({
//         path: "cart.items.invoiceIds",    
//         select: "amount date",            
//     })
//     .populate("paymentHistory");  
//     next();
// });


// customerSchema.post('save', async function (doc) {
//     // Recalculate the total purchased amount after saving a document
//     await calculateTotalPurchasedAmount(doc._id);
//     await calculateRemainingAmount(doc._id);
// });

// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         // Recalculate the total and remaining amounts after an update
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });

// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate({
//             path: "cart.items.invoiceIds", // Populate invoice details
//             select: "amount",
//         });

//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         let totalAmount = 0;
//         if (customer.cart && customer.cart.items) {
//             customer.cart.items.forEach(item => {
//                 if (item.invoiceIds) {
//                     item.invoiceIds.forEach(invoice => {
//                         if (invoice && invoice.amount) {
//                             totalAmount += invoice.amount;  // Add the invoice amount to the total
//                         }
//                     });
//                 }
//             });
//         }

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }

//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error in calculating remaining amount", err);
//     }
// }


// // const mongoose = require("mongoose");
// // const Schema = mongoose.Schema;
// // const Invoice = require('./invoiceModel');

// // // Improved cart item schema
// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Product",
// //         required: true,
// //         index: true 
// //     },
// //     invoices: [{
// //         type: Schema.Types.ObjectId,
// //         ref: "Invoice",
// //         validate: {
// //             validator: async function(v) {
// //                 return await mongoose.model('Invoice').exists({ _id: v });
// //             },
// //             message: props => `Invoice ${props.value} does not exist`
// //         }
// //     }]
// // }, { _id: false });


// // const customerSchema = new Schema({
// //     createdAt: { type: Date, default: Date.now },
// //     updatedAt: { type: Date, default: Date.now },
// //     status: {
// //         type: String,
// //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// //         default: "pending",
// //         index: true
// //     },
// //     email: {
// //         type: String,
// //         unique: true,
// //         lowercase: true,
// //         trim: true,
// //         validate: {
// //             validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
// //             message: props => `${props.value} is not a valid email address!`
// //         }
// //     },
// //     fullname: { 
// //         type: String, 
// //         required: true,
// //         trim: true,
// //         maxlength: 100 
// //     },
// //     phoneNumbers: [{
// //         number: { 
// //             type: String, 
// //             required: true,
// //             validate: {
// //                 validator: function(v) {
// //                     return /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.0-9]{9,}$/.test(v);
// //                 },
// //                 message: props => `${props.value} is not a valid phone number!`
// //             }
// //         },
// //         type: { 
// //             type: String, 
// //             enum: ["home", "mobile", "work"], 
// //             required: true 
// //         },
// //         primary: { type: Boolean, default: false }
// //     }],
// //     addresses: [{
// //         street: { type: String, required: true },
// //         city: { type: String, required: true },
// //         state: { type: String, required: true },
// //         zipCode: { 
// //             type: String, 
// //             required: true,
// //             validate: {
// //                 validator: function(v) {
// //                     return /^\d{5,6}(?:[-\s]\d{4})?$/.test(v);
// //                 },
// //                 message: props => `${props.value} is not a valid zip code!`
// //             }
// //         },
// //         country: { type: String, required: true },
// //         type: { 
// //             type: String, 
// //             enum: ["billing", "shipping", "home", "work"], 
// //             required: true 
// //         },
// //         isDefault: { type: Boolean, default: false }
// //     }],
// //     cart: {
// //         items: [cartItemSchema],
// //         validate: {
// //             validator: function(v) {
// //                 return v.items.length <= 100; // Prevent cart bloating
// //             },
// //             message: 'Cart cannot contain more than 100 items'
// //         }
// //     },
// //     guaranteerId: { 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Customer",
// //         validate: {
// //             validator: async function(v) {
// //                 if (!v) return true; // Allow null/undefined
// //                 return await mongoose.model('Customer').exists({ _id: v });
// //             },
// //             message: props => `Guaranteer ${props.value} does not exist`
// //         }
// //     },
// //     totalPurchasedAmount: { 
// //         type: Number, 
// //         default: 0,
// //         min: 0 
// //     },
// //     remainingAmount: { 
// //         type: Number, 
// //         default: 0,
// //         min: 0 
// //     },
// //     paymentHistory: [{ 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Payment",
// //         validate: {
// //             validator: async function(v) {
// //                 return await mongoose.model('Payment').exists({ _id: v });
// //             },
// //             message: props => `Payment ${props.value} does not exist`
// //         }
// //     }],
// //     metadata: { 
// //         type: Map, 
// //         of: Schema.Types.Mixed,
// //         default: new Map() 
// //     }
// // }, { 
// //     timestamps: true,
// //     toJSON: { virtuals: true },
// //     toObject: { virtuals: true }
// // });

// // // Indexes
// // customerSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
// // customerSchema.index({ 'phoneNumbers.number': 1 }, { unique: true, partialFilterExpression: { 'phoneNumbers.number': { $exists: true } } });

// // // Virtuals
// // customerSchema.virtual('primaryPhone').get(function() {
// //     return this.phoneNumbers.find(ph => ph.primary)?.number;
// // });

// // customerSchema.virtual('defaultAddress').get(function() {
// //     return this.addresses.find(addr => addr.isDefault);
// // });

// // // Optimized pre-hooks
// // customerSchema.pre(/^find/, function(next) {
// //     this.select('-__v -metadata');
// //     next();
// // });

// // customerSchema.pre('findOne', function(next) {
// //     this.populate({
// //         path: 'cart.items.productId',
// //         select: 'name price sku'
// //     }).populate({
// //         path: 'paymentHistory',
// //         select: 'amount date method'
// //     });
// //     next();
// // });

// // // Optimized post hooks using bulk operations
// // customerSchema.post(['save', 'findOneAndUpdate'], async function(doc) {
// //     if (doc) {
// //         await Promise.all([
// //             calculateTotalPurchasedAmount(doc),
// //             calculateRemainingAmount(doc)
// //         ]);
// //     }
// // });

// // customerSchema.post('findOneAndDelete', async function(doc) {
// //     if (doc) {
// //         // Cleanup related data
// //         await Promise.all([
// //             mongoose.model('Invoice').deleteMany({ customerId: doc._id }),
// //             mongoose.model('Payment').deleteMany({ customerId: doc._id })
// //         ]);
// //     }
// // });

// // // Improved calculation functions
// // async function calculateTotalPurchasedAmount(customer) {
// //     try {
// //         const result = await mongoose.model('Invoice').aggregate([
// //             { $match: { customerId: customer._id } },
// //             { $group: { _id: null, total: { $sum: "$amount" } } }
// //         ]);
        
// //         customer.totalPurchasedAmount = result[0]?.total || 0;
// //         await customer.save({ validateBeforeSave: false });
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //         throw error;
// //     }
// // }

// // async function calculateRemainingAmount(customer) {
// //     try {
// //         const paymentTotal = await mongoose.model('Payment').aggregate([
// //             { $match: { customerId: customer._id } },
// //             { $group: { _id: null, total: { $sum: "$amount" } } }
// //         ]);
        
// //         customer.remainingAmount = customer.totalPurchasedAmount - (paymentTotal[0]?.total || 0);
// //         await customer.save({ validateBeforeSave: false });
// //     } catch (error) {
// //         console.error("Error calculating remaining amount:", error);
// //         throw error;
// //     }
// // }

// // module.exports = mongoose.model("Customer", customerSchema);





// // ======================================================
// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const Invoice=require('./invoiceModel')

// const cartItemSchema = new Schema({
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product",  // Link to the Product schema
//         required: true 
//     },
//     invoiceIds: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Invoice"  // Link to the Invoice schema
//     }],
// });
// const customerSchema = new Schema({
//     // customerId: { type: mongoose.Schema.Types.ObjectId },
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {type: String, enum: ["active", "inactive", "pending", "suspended", "blocked"], default: "pending",},
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{ number: { type: String, required: true }, type: { type: String, enum: ["home", "mobile", "work"], required: true }, primary: { type: Boolean, default: false } },],
//     addresses: [{ street: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true }, zipCode: { type: String, required: true }, country: { type: String, required: true }, type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true }, isDefault: { type: Boolean, default: false } },],
//     cart: { items: [cartItemSchema] },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",required:false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number },
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, { timestamps: true });


// customerSchema.pre(/^find/, async function (next) {
//     this.populate({ path: "cart.items.productId", select: "-__v" });
//     this.populate({ path: "cart.items.invoiceIds", select: "amount" });
//     this.populate("paymentHistory");
//     next();
// });
// customerSchema.post('save', async function (doc) {
//     await calculateTotalPurchasedAmount(doc._id);
//     await calculateRemainingAmount(doc._id);
// });
// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });
// customerSchema.post('findOneAndDelete', async function (doc) {
//     if (doc) {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });

// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate({ 
//             path: "cart.items.invoiceIds",
//             select: "amount",
//         });
//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }
//         let totalAmount = 0;
//         if (customer.cart && customer.cart.items) {
//             customer.cart.items.forEach(item => {
//                 if (item.invoiceIds) {
//                     item.invoiceIds.forEach(invoice => {
//                         if (invoice && invoice.amount) {
//                             totalAmount += invoice.amount;
//                         }
//                     });
//                 }
//             });
//         }

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }
//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }
//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("error in calculating remaining amount", err);
//     }
// }
// module.exports= mongoose.model("Customer", customerSchema);
 */

// const cartItemSchema = new Schema({
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product",  
//         required: true 
//     },
//     invoiceIds: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Invoice"  
//     }],
// });

// const customerSchema = new Schema({
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {
//         type: String,
//         enum: ["active", "inactive", "pending", "suspended", "blocked"],
//         default: "pending",
//     },
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{
//         number: { type: String, required: true },
//         type: { type: String, enum: ["home", "mobile", "work"], required: true },
//         primary: { type: Boolean, default: false }
//     }],
//     addresses: [{
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         zipCode: { type: String, required: true },
//         country: { type: String, required: true },
//         type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true },
//         isDefault: { type: Boolean, default: false }
//     }],
//     cart: {
//         items: [cartItemSchema]  // Include the cart items with product and invoice references
//     },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number },
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, { timestamps: true });


// customerSchema.pre(/^find/, async function(next) {
//     this.populate({
//         path: "cart.items.productId",   
//         select: "-__v",                  
//     })
//     .populate({
//         path: "cart.items.invoiceIds",    
//         select: "amount date",            
//     })
//     .populate("paymentHistory");  
//     next();
// });


// customerSchema.post('save', async function (doc) {
//     // Recalculate the total purchased amount after saving a document
//     await calculateTotalPurchasedAmount(doc._id);
//     await calculateRemainingAmount(doc._id);
// });

// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         // Recalculate the total and remaining amounts after an update
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });

// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate({
//             path: "cart.items.invoiceIds", // Populate invoice details
//             select: "amount",
//         });

//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }

//         let totalAmount = 0;
//         if (customer.cart && customer.cart.items) {
//             customer.cart.items.forEach(item => {
//                 if (item.invoiceIds) {
//                     item.invoiceIds.forEach(invoice => {
//                         if (invoice && invoice.amount) {
//                             totalAmount += invoice.amount;  // Add the invoice amount to the total
//                         }
//                     });
//                 }
//             });
//         }

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }

//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }

//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("Error in calculating remaining amount", err);
//     }
// }


// // const mongoose = require("mongoose");
// // const Schema = mongoose.Schema;
// // const Invoice = require('./invoiceModel');

// // // Improved cart item schema
// // const cartItemSchema = new Schema({
// //     productId: { 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Product",
// //         required: true,
// //         index: true 
// //     },
// //     invoices: [{
// //         type: Schema.Types.ObjectId,
// //         ref: "Invoice",
// //         validate: {
// //             validator: async function(v) {
// //                 return await mongoose.model('Invoice').exists({ _id: v });
// //             },
// //             message: props => `Invoice ${props.value} does not exist`
// //         }
// //     }]
// // }, { _id: false });


// // const customerSchema = new Schema({
// //     createdAt: { type: Date, default: Date.now },
// //     updatedAt: { type: Date, default: Date.now },
// //     status: {
// //         type: String,
// //         enum: ["active", "inactive", "pending", "suspended", "blocked"],
// //         default: "pending",
// //         index: true
// //     },
// //     email: {
// //         type: String,
// //         unique: true,
// //         lowercase: true,
// //         trim: true,
// //         validate: {
// //             validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
// //             message: props => `${props.value} is not a valid email address!`
// //         }
// //     },
// //     fullname: { 
// //         type: String, 
// //         required: true,
// //         trim: true,
// //         maxlength: 100 
// //     },
// //     phoneNumbers: [{
// //         number: { 
// //             type: String, 
// //             required: true,
// //             validate: {
// //                 validator: function(v) {
// //                     return /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.0-9]{9,}$/.test(v);
// //                 },
// //                 message: props => `${props.value} is not a valid phone number!`
// //             }
// //         },
// //         type: { 
// //             type: String, 
// //             enum: ["home", "mobile", "work"], 
// //             required: true 
// //         },
// //         primary: { type: Boolean, default: false }
// //     }],
// //     addresses: [{
// //         street: { type: String, required: true },
// //         city: { type: String, required: true },
// //         state: { type: String, required: true },
// //         zipCode: { 
// //             type: String, 
// //             required: true,
// //             validate: {
// //                 validator: function(v) {
// //                     return /^\d{5,6}(?:[-\s]\d{4})?$/.test(v);
// //                 },
// //                 message: props => `${props.value} is not a valid zip code!`
// //             }
// //         },
// //         country: { type: String, required: true },
// //         type: { 
// //             type: String, 
// //             enum: ["billing", "shipping", "home", "work"], 
// //             required: true 
// //         },
// //         isDefault: { type: Boolean, default: false }
// //     }],
// //     cart: {
// //         items: [cartItemSchema],
// //         validate: {
// //             validator: function(v) {
// //                 return v.items.length <= 100; // Prevent cart bloating
// //             },
// //             message: 'Cart cannot contain more than 100 items'
// //         }
// //     },
// //     guaranteerId: { 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Customer",
// //         validate: {
// //             validator: async function(v) {
// //                 if (!v) return true; // Allow null/undefined
// //                 return await mongoose.model('Customer').exists({ _id: v });
// //             },
// //             message: props => `Guaranteer ${props.value} does not exist`
// //         }
// //     },
// //     totalPurchasedAmount: { 
// //         type: Number, 
// //         default: 0,
// //         min: 0 
// //     },
// //     remainingAmount: { 
// //         type: Number, 
// //         default: 0,
// //         min: 0 
// //     },
// //     paymentHistory: [{ 
// //         type: Schema.Types.ObjectId, 
// //         ref: "Payment",
// //         validate: {
// //             validator: async function(v) {
// //                 return await mongoose.model('Payment').exists({ _id: v });
// //             },
// //             message: props => `Payment ${props.value} does not exist`
// //         }
// //     }],
// //     metadata: { 
// //         type: Map, 
// //         of: Schema.Types.Mixed,
// //         default: new Map() 
// //     }
// // }, { 
// //     timestamps: true,
// //     toJSON: { virtuals: true },
// //     toObject: { virtuals: true }
// // });

// // // Indexes
// // customerSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
// // customerSchema.index({ 'phoneNumbers.number': 1 }, { unique: true, partialFilterExpression: { 'phoneNumbers.number': { $exists: true } } });

// // // Virtuals
// // customerSchema.virtual('primaryPhone').get(function() {
// //     return this.phoneNumbers.find(ph => ph.primary)?.number;
// // });

// // customerSchema.virtual('defaultAddress').get(function() {
// //     return this.addresses.find(addr => addr.isDefault);
// // });

// // // Optimized pre-hooks
// // customerSchema.pre(/^find/, function(next) {
// //     this.select('-__v -metadata');
// //     next();
// // });

// // customerSchema.pre('findOne', function(next) {
// //     this.populate({
// //         path: 'cart.items.productId',
// //         select: 'name price sku'
// //     }).populate({
// //         path: 'paymentHistory',
// //         select: 'amount date method'
// //     });
// //     next();
// // });

// // // Optimized post hooks using bulk operations
// // customerSchema.post(['save', 'findOneAndUpdate'], async function(doc) {
// //     if (doc) {
// //         await Promise.all([
// //             calculateTotalPurchasedAmount(doc),
// //             calculateRemainingAmount(doc)
// //         ]);
// //     }
// // });

// // customerSchema.post('findOneAndDelete', async function(doc) {
// //     if (doc) {
// //         // Cleanup related data
// //         await Promise.all([
// //             mongoose.model('Invoice').deleteMany({ customerId: doc._id }),
// //             mongoose.model('Payment').deleteMany({ customerId: doc._id })
// //         ]);
// //     }
// // });

// // // Improved calculation functions
// // async function calculateTotalPurchasedAmount(customer) {
// //     try {
// //         const result = await mongoose.model('Invoice').aggregate([
// //             { $match: { customerId: customer._id } },
// //             { $group: { _id: null, total: { $sum: "$amount" } } }
// //         ]);
        
// //         customer.totalPurchasedAmount = result[0]?.total || 0;
// //         await customer.save({ validateBeforeSave: false });
// //     } catch (error) {
// //         console.error("Error calculating total purchased amount:", error);
// //         throw error;
// //     }
// // }

// // async function calculateRemainingAmount(customer) {
// //     try {
// //         const paymentTotal = await mongoose.model('Payment').aggregate([
// //             { $match: { customerId: customer._id } },
// //             { $group: { _id: null, total: { $sum: "$amount" } } }
// //         ]);
        
// //         customer.remainingAmount = customer.totalPurchasedAmount - (paymentTotal[0]?.total || 0);
// //         await customer.save({ validateBeforeSave: false });
// //     } catch (error) {
// //         console.error("Error calculating remaining amount:", error);
// //         throw error;
// //     }
// // }

// // module.exports = mongoose.model("Customer", customerSchema);





// // ======================================================
// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const Invoice=require('./invoiceModel')

// const cartItemSchema = new Schema({
//     productId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Product",  // Link to the Product schema
//         required: true 
//     },
//     invoiceIds: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Invoice"  // Link to the Invoice schema
//     }],
// });
// const customerSchema = new Schema({
//     // customerId: { type: mongoose.Schema.Types.ObjectId },
//     createdAt: { type: Date, required: true, default: Date.now },
//     updatedAt: { type: Date, required: true, default: Date.now },
//     status: {type: String, enum: ["active", "inactive", "pending", "suspended", "blocked"], default: "pending",},
//     email: { type: String, unique: true, match: /.+\@.+\..+/ },
//     fullname: { type: String, required: true },
//     phoneNumbers: [{ number: { type: String, required: true }, type: { type: String, enum: ["home", "mobile", "work"], required: true }, primary: { type: Boolean, default: false } },],
//     addresses: [{ street: { type: String, required: true }, city: { type: String, required: true }, state: { type: String, required: true }, zipCode: { type: String, required: true }, country: { type: String, required: true }, type: { type: String, enum: ["billing", "shipping", "home", "work"], required: true }, isDefault: { type: Boolean, default: false } },],
//     cart: { items: [cartItemSchema] },
//     guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",required:false },
//     totalPurchasedAmount: { type: Number, default: 0 },
//     remainingAmount: { type: Number },
//     paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
//     metadata: { type: Map, of: Schema.Types.Mixed },
// }, { timestamps: true });


// customerSchema.pre(/^find/, async function (next) {
//     this.populate({ path: "cart.items.productId", select: "-__v" });
//     this.populate({ path: "cart.items.invoiceIds", select: "amount" });
//     this.populate("paymentHistory");
//     next();
// });
// customerSchema.post('save', async function (doc) {
//     await calculateTotalPurchasedAmount(doc._id);
//     await calculateRemainingAmount(doc._id);
// });
// customerSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });
// customerSchema.post('findOneAndDelete', async function (doc) {
//     if (doc) {
//         await calculateTotalPurchasedAmount(doc._id);
//         await calculateRemainingAmount(doc._id);
//     }
// });

// async function calculateTotalPurchasedAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate({ 
//             path: "cart.items.invoiceIds",
//             select: "amount",
//         });
//         if (!customer) {
//             console.error("Customer not found");
//             return;
//         }
//         let totalAmount = 0;
//         if (customer.cart && customer.cart.items) {
//             customer.cart.items.forEach(item => {
//                 if (item.invoiceIds) {
//                     item.invoiceIds.forEach(invoice => {
//                         if (invoice && invoice.amount) {
//                             totalAmount += invoice.amount;
//                         }
//                     });
//                 }
//             });
//         }

//         customer.totalPurchasedAmount = totalAmount;
//         await customer.save();
//     } catch (error) {
//         console.error("Error calculating total purchased amount:", error);
//     }
// }

// async function calculateRemainingAmount(customerId) {
//     try {
//         const customer = await Customer.findById(customerId).populate('paymentHistory');
//         if (!customer) {
//             console.log("customer not found");
//             return;
//         }
//         let totalPaid = 0;
//         if (customer.paymentHistory) {
//             customer.paymentHistory.forEach(payment => {
//                 totalPaid += payment.amount;
//             });
//         }
//         customer.remainingAmount = customer.totalPurchasedAmount - totalPaid;
//         await customer.save();
//     } catch (err) {
//         console.log("error in calculating remaining amount", err);
//     }
// }
// module.exports= mongoose.model("Customer", customerSchema);
