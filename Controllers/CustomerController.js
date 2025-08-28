const Customer = require("../Models/customerModel"); // Your Customer model
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const { body, validationResult } = require("express-validator"); // For API validation
const multer = require("multer"); // For API file uploads
const { createClient } = require("@supabase/supabase-js"); // For Supabase integration
const mongoose = require("mongoose"); // Needed for ObjectId validation

// Factory handlers for common CRUD operations
const handleFactory = require("./handleFactory");
const ApiFeatures = require("../Utils/ApiFeatures"); // Import ApiFeatures

// Supabase setup (uncomment and configure if used)
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// --- API Controller Functions (for Express routes) ---

// Assuming `uploadProfileImage` is an API-only function due to multer/supabase dependency
// exports.uploadProfileImage = [
//     upload.single('profileImg'),
//     catchAsync(async (req, res, next) => {
//         const customerId = req.params.id;
//         const file = req.file;
//         const userId = req.user._id; // Get the authenticated user's ID

//         if (!file) return next(new AppError('No file uploaded', 400));

//         const fileName = `${Date.now()}_${file.originalname}`;
//         const { error } = await supabase.storage
//             .from(process.env.SUPABASE_BUCKET)
//             .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
//         if (error) return next(new AppError('Failed to upload image', 500));

//         const { publicUrl } = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(fileName);

//         const customer = await Customer.findOneAndUpdate(
//             { _id: customerId, owner: userId },
//             { profileImg: publicUrl },
//             { new: true }
//         );

//         if (!customer) return next(new AppError('Customer not found or you do not have permission.', 404));

//         res.status(200).json({
//             status: 'success',
//             statusCode: 200,
//             message: 'Profile image uploaded successfully',
//             data: { profileImg: publicUrl },
//         });
//     }),
// ];

exports.findDuplicateCustomer = catchAsync(async (req, res, next) => {
    const phoneNumbers = req.body.phoneNumbers;
    const userId = req.user._id; // Get the authenticated user's ID
    const isSuperAdmin = req.user.role === "superAdmin";

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return next(new AppError("Phone numbers must be an array", 400));
    }
    const numbersToCheck = phoneNumbers.map((item) => item.number);

    let filter = { "phoneNumbers.number": { $in: numbersToCheck } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const existingCustomer = await Customer.findOne(filter);

    if (existingCustomer) {
        return next(
            new AppError(
                `Customer with phone number(s) ${numbersToCheck.join(", ")} already exists for this user.`,
                400,
            ),
        );
    }
    next();
});

// Create New Customer API endpoint using factory handler and validation
exports.newCustomer = [
    body("email").isEmail().withMessage("Invalid email"),
    body("fullname").notEmpty().withMessage("Full name is required"),
    body("phoneNumbers.*.number")
        .notEmpty()
        .withMessage("Phone number is required"),
    // Pre-validation to check for reactivation logic before factory handler creates
    catchAsync(async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(
                new AppError(
                    errors
                        .array()
                        .map((e) => e.msg)
                        .join(", "),
                    400,
                ),
            );
        }

        const { email } = req.body;
        const userId = req.user._id;
        const isSuperAdmin = req.user.role === "superAdmin";

        let filter = { email };
        if (!isSuperAdmin) {
            filter.owner = userId; // Filter by owner unless superAdmin
        }

        let customer = await Customer.findOne(filter);

        if (customer) {
            if (customer.status === "inactive") {
                req.params.id = customer._id; // Set ID for update factory
                req.body.status = "active"; // Ensure status is set to active
                return handleFactory.update(Customer)(req, res, next); // Pass control to update
            }
            return next(
                new AppError("Customer already active for this user.", 400),
            );
        }
        next(); // If no existing customer or not inactive, proceed to creation
    }),
    handleFactory.create(Customer), // Use factory handler for actual creation
];

// Get Customer by ID API endpoint using factory handler
exports.getCustomerById = handleFactory.getOne(Customer); // This now handles superAdmin logic

// Get All Customers API endpoint using factory handler
exports.getAllCustomer = handleFactory.getAll(Customer); // This now handles superAdmin logic

// Update Customer API endpoint using factory handler
exports.updateCustomer = handleFactory.update(Customer); // This now handles superAdmin logic

// Delete Customer API endpoint using factory handler
exports.deleteCustomer = handleFactory.delete(Customer); // This now handles superAdmin logic

// Deactivate Multiple Customers API endpoint
exports.deactivateMultipleCustomers = catchAsync(async (req, res, next) => {
    const ids = req.body.ids;
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === "superAdmin";

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(
            new AppError("No valid IDs provided for deactivation.", 400),
        );
    }
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
        return next(new AppError("No valid IDs provided.", 400));
    }

    let filter = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const result = await Customer.updateMany(filter, { status: "inactive" });

    if (result.matchedCount === 0) {
        return next(
            new AppError(
                `No customers found for your account with the provided IDs.`,
                404,
            ),
        );
    }

    res.status(200).json({
        status: "success",
        statusCode: 200,
        message: `${result.modifiedCount} customers deactivated successfully.`,
    });
});

exports.getCustomersNearMe = catchAsync(async (req, res, next) => {
    const { lng, lat, distance } = req.query;

    if (!lng || !lat) {
        return next(
            new AppError(
                "Please provide latitude and longitude in the query string.",
                400,
            ),
        );
    }

    const customers = await Customer.findNear(lng, lat, distance);

    res.status(200).json({
        status: "success",
        results: customers.length,
        data: {
            customers,
        },
    });
});

exports.createCustomerWithGeocoding = catchAsync(async (req, res, next) => {
    const customerData = req.body;

    // Check if there are addresses to geocode
    if (customerData.addresses && customerData.addresses.length > 0) {
        for (const address of customerData.addresses) {
            // Combine the address parts into a single string for geocoding
            const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

            const loc = await geocoder.geocode(addressString);

            // Add the location to the address object
            address.location = {
                type: "Point",
                coordinates: [loc[0].longitude, loc[0].latitude],
            };
        }
    }

    // Assign the owner and create the customer
    customerData.owner = req.user._id;
    const customer = await Customer.create(customerData);

    res.status(201).json({
        status: "success",
        data: {
            customer,
        },
    });
});

// --- Bot-Specific Helper Functions (No req, res, next) ---
// These functions will be called directly by the Telegram bot handlers.

exports.newCustomerBot = async (customerData, userId) => {
    const { email, phoneNumbers, fullname, ...otherData } = customerData;

    if (
        !email ||
        !fullname ||
        !phoneNumbers ||
        !Array.isArray(phoneNumbers) ||
        phoneNumbers.length === 0
    ) {
        throw new AppError(
            "Email, full name, and at least one phone number are required.",
            400,
        );
    }
    if (!phoneNumbers.every((p) => p.number)) {
        throw new AppError(
            'All phone numbers must have a "number" field.',
            400,
        );
    }

    // Check for existing customer for reactivation or duplication for this user
    let customer = await Customer.findOne({ email, owner: userId });

    if (customer) {
        if (customer.status === "inactive") {
            customer = await Customer.findByIdAndUpdate(
                customer._id,
                { status: "active", phoneNumbers, fullname, ...otherData },
                { new: true },
            );
            return { message: "Customer reactivated successfully", customer };
        }
        throw new AppError("Customer already active for this user.", 400);
    }

    // Create new customer, assigning the current user as owner
    customer = await Customer.create({
        email,
        phoneNumbers,
        fullname,
        ...otherData,
        owner: userId,
    });

    return { message: "Customer created successfully", customer };
};

exports.getCustomerByIdBot = async (
    customerId,
    userId,
    isSuperAdmin = false,
) => {
    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    let customer = await Customer.getUserWithTotals(filter); // Use your specific method

    if (!customer) {
        throw new AppError(
            `Customer not found with ID ${customerId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }

    // This update is specific to your customer model logic
    customer = await Customer.updateRemainingAmount(customer._id);
    if (!customer)
        throw new AppError(
            "Failed to update remaining amount for customer",
            500,
        );

    return customer;
};

exports.getAllCustomersBot = async (
    userId,
    isSuperAdmin = false,
    queryFilters = {},
) => {
    let baseFilter = {};
    if (!isSuperAdmin) {
        baseFilter = { owner: userId };
    }

    const combinedFilter = {
        ...baseFilter,
        ...queryFilters, // Allow external query filters for the bot
    };

    const features = new ApiFeatures(Customer.find(), combinedFilter)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const customers = await features.query;
    return customers;
};

exports.updateCustomerBot = async (
    customerId,
    updateData,
    userId,
    isSuperAdmin = false,
) => {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError("Invalid customer ID.", 400);
    }

    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
        filter,
        updateData,
        {
            new: true,
            runValidators: true,
        },
    );

    if (!updatedCustomer) {
        throw new AppError(
            `Customer not found with ID ${customerId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }
    return updatedCustomer;
};

exports.deleteCustomerBot = async (
    customerId,
    userId,
    isSuperAdmin = false,
) => {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError("Invalid customer ID.", 400);
    }

    let filter = { _id: customerId };
    if (!isSuperAdmin) {
        filter.owner = userId;
    }

    const deletedCustomer = await Customer.findOneAndDelete(filter);

    if (!deletedCustomer) {
        throw new AppError(
            `Customer not found with ID ${customerId}` +
                (!isSuperAdmin ? " or you do not have permission." : "."),
            404,
        );
    }
    return { message: "Customer deleted successfully" };
};

exports.deactivateMultipleCustomersBot = async (
    customerIds,
    userId,
    isSuperAdmin = false,
) => {
    if (
        !customerIds ||
        !Array.isArray(customerIds) ||
        customerIds.length === 0
    ) {
        throw new AppError("No valid IDs provided for deactivation.", 400);
    }
    const validIds = customerIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
    );
    if (validIds.length === 0) {
        throw new AppError("No valid IDs provided.", 400);
    }

    let filter = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
        filter.owner = userId; // Filter by owner unless superAdmin
    }

    const result = await Customer.updateMany(filter, { status: "inactive" });

    if (result.matchedCount === 0) {
        throw new AppError(
            `No customers found for your account with the provided IDs.`,
            404,
        );
    }

    return {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} customers deactivated successfully.`,
    };
};

// --- CUSTOMER SNAPSHOT CONTROLLER (FIXED) ---
exports.getCustomerSnapshot = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // **FIX:** Add validation to ensure the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid customer ID format.", 400));
    }

    const ownerFilter =
        req.user.role === "superAdmin" ? {} : { owner: req.user._id };
    const customerId = new mongoose.Types.ObjectId(id);

    const [
        customerDetails,
        lifetimeValue,
        recentInvoices,
        recentPayments,
        overdueInvoices,
        productPreferences,
    ] = await Promise.all([
        Customer.findOne({ _id: customerId, ...ownerFilter }).lean(),
        Invoice.aggregate([
            { $match: { buyer: customerId, ...ownerFilter } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Invoice.find({ buyer: customerId, ...ownerFilter })
            .sort({ invoiceDate: -1 })
            .limit(5)
            .lean(),
        Payment.find({ customerId: customerId, ...ownerFilter })
            .sort({ date: -1 })
            .limit(5)
            .lean(),
        Invoice.find({
            buyer: customerId,
            status: { $in: ["unpaid", "partially paid"] },
            dueDate: { $lt: new Date() },
            ...ownerFilter,
        }).lean(),
        Invoice.aggregate([
            { $match: { buyer: customerId, ...ownerFilter } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    count: { $sum: "$items.quantity" },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 0,
                    product: "$productInfo.title",
                    quantity: "$count",
                },
            },
        ]),
    ]);

    if (!customerDetails) {
        return next(
            new AppError(
                "Customer not found or you do not have permission to view this record.",
                404,
            ),
        );
    }

    const snapshot = {
        customer: customerDetails,
        lifetimeValue: lifetimeValue[0]?.total || 0,
        recentActivity: {
            invoices: recentInvoices,
            payments: recentPayments,
        },
        overdueInvoices,
        productPreferences,
    };

    res.status(200).json({
        status: "success",
        data: snapshot,
    });
});
