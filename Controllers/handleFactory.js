const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const ApiFeatures = require("../Utils/ApiFeatures");
const mongoose = require('mongoose');

/**
 * Generic factory handler for deleting a single document by ID and owner.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model (e.g., Customer, Product).
 * @returns {Function} An Express middleware function.
 */
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const isSuperAdmin = req.user.role === 'superAdmin';
    let filter = { _id: req.params.id };
    if (!isSuperAdmin) {
      filter.owner = req.user._id; // Add owner filter if not super admin
    }

    const doc = await Model.findOneAndDelete(filter);

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
        (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `${Model.modelName} deleted successfully`,
      data: null,
    });
  });

/**
 * Generic factory handler for updating a single document by ID and owner.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @returns {Function} An Express middleware function.
 */
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const isSuperAdmin = req.user.role === 'superAdmin';
    let filter = { _id: req.params.id };
    if (!isSuperAdmin) {
      filter.owner = req.user._id; // Add owner filter if not super admin
    }

    const doc = await Model.findOneAndUpdate(
      filter,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
        (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: doc,
    });
  });

/**
 * Generic factory handler for creating a new document, assigning the current user as owner.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @returns {Function} An Express middleware function.
 */
exports.newOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // console.log(req.user); // This is good for debugging

    // Ensure owner is set from req.user._id if not superAdmin, or allow superAdmin to set it
    // For simplicity and security, it's safer to always assign the current user as owner on creation
    // unless there's a specific reason for a superAdmin to create on behalf of another.
    // Given your existing logic, we'll assign the logged-in user as owner.
    const ownerIdToAssign = req.user._id;

    const doc = await Model.create({
      ...req.body,
      owner: ownerIdToAssign
    });

    if (!doc) {
      return next(new AppError(`Failed to create ${Model.modelName}`, 400));
    }

    res.status(201).json({
      status: "success",
      statusCode: 201, // Changed to 201 for creation
      data: doc,
    });
  });

/**
 * Generic factory handler for getting a single document by ID and owner.
 * Allows super admins to get any document, otherwise gets by ID and owner.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @param {string|object} [autoPopulateOptions] Options for Mongoose populate.
 * @returns {Function} An Express middleware function.
 */
exports.getOne = (Model, autoPopulateOptions) =>
  catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    let filter = { _id: req.params.id };
    if (!isSuperAdmin) {
      filter.owner = userId;
    }

    let query = Model.findOne(filter);

    if (autoPopulateOptions) {
      query = query.populate(autoPopulateOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(
        new AppError(
          `${Model.modelName} not found with Id ${req.params.id}` +
          (!isSuperAdmin ? ' or you do not have permission.' : '.'),
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: doc,
    });
  });

/**
 * Generic factory handler for getting all documents.
 * Allows super admins to get all documents across all owners, otherwise gets documents for the current user.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @returns {Function} An Express middleware function.
 */
exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // console.log(req.user.role); // Good for debugging

    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    let baseFilter = {};
    if (!isSuperAdmin) {
      baseFilter = { owner: userId };
    }

    const combinedFilter = {
      ...baseFilter,
      ...req.query,
    };

     let query = Model.find(combinedFilter); // Start with a query object

    if (autoPopulateOptions) { 
      query = query.populate(autoPopulateOptions);
    }

    const features = new ApiFeatures(query, combinedFilter) // Pass the query object
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query; // Execute t

    res.status(200).json({
      status: "success",
      statusCode: 200,
      results: docs.length,
      data: docs,
    });
  });

/**
 * Generic factory handler for deleting multiple documents by IDs.
 * Allows super admins to delete any documents matching the IDs, otherwise deletes documents matching IDs and owner.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @returns {Function} An Express middleware function.
 */
exports.deleteMany = (Model) => // Renamed to deleteMany for generality
  catchAsync(async (req, res, next) => {
    const ids = req.body.ids;
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superAdmin';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError("No valid IDs provided for deletion.", 400));
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return next(new AppError("No valid IDs provided.", 400));
    }

    let filter = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
      filter.owner = userId;
    }

    const result = await Model.deleteMany(filter);

    if (result.deletedCount === 0) {
      const message = `No ${Model.modelName}s found with the provided IDs` +
        (!isSuperAdmin ? ' for your account.' : '.');
      return next(new AppError(message, 404));
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
    });
  });

/**
 * Generic factory handler for fetching dropdown data (select fields).
 * Allows super admins to fetch dropdown data across all owners, otherwise fetches data for the current user.
 * Requires the 'protect' middleware to run before this handler in the route.
 *
 * @param {Mongoose.Model} Model The Mongoose model.
 * @param {string[]} fields An array of field names to select (e.g., ['name', 'code']).
 * @returns {Function} An Express middleware function.
 */
exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const isSuperAdmin = req.user.role === 'superAdmin';

  try {
    let filter = {};
    if (!isSuperAdmin) {
      filter.owner = userId;
    }
    const documents = await Model.find(filter)
      .select(fields.join(' ') + ' _id')
      .lean();
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      results: documents.length,
      data: { dropdown: documents },
    });
  } catch (error) {
    console.error("Error fetching dropdown data:", error);
    return next(new AppError('Failed to fetch dropdown data', 500));
  }
});

// const AppError = require("../Utils/appError");
// const catchAsync = require("../Utils/catchAsyncModule");
// const ApiFeatures = require("../Utils/ApiFeatures"); // Assuming this utility handles filters correctly
// const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// /**
//  * Generic factory handler for deleting a single document by ID and owner.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model (e.g., Customer, Product).
//  * @returns {Function} An Express middleware function.
//  */
// exports.deleteOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     // Ensure the document belongs to the authenticated user before deleting
//     const doc = await Model.findOneAndDelete({
//       _id: req.params.id,
//       owner: req.user._id // Crucial: Filter by owner, req.user._id is available here
//     });

//     if (!doc) {
//       // If doc is not found, it means either the ID is wrong, or it doesn't belong to the user
//       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id} or you do not have permission.`, 404));
//     }

//     res.status(200).json({
//       status: "success",
//       statusCode: 200,
//       message: `${Model.modelName} deleted successfully`,
//       data: null,
//     });
//   });

// /**
//  * Generic factory handler for updating a single document by ID and owner.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @returns {Function} An Express middleware function.
//  */
// exports.updateOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     // Ensure the document belongs to the authenticated user before updating
//     const doc = await Model.findOneAndUpdate(
//       {
//         _id: req.params.id,
//         owner: req.user._id // Crucial: Filter by owner, req.user._id is available here
//       },
//       req.body,
//       {
//         new: true, // Return the updated document
//         runValidators: true, // Run schema validators on update
//       }
//     );

//     if (!doc) {
//       // If doc is not found, it means either the ID is wrong, or it doesn't belong to the user
//       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id} or you do not have permission.`, 404));
//     }

//     res.status(200).json({ // Changed status to 200 for successful update
//       status: "success",
//       statusCode: 200,
//       data: doc,
//     });
//   });

// /**
//  * Generic factory handler for creating a new document, assigning the current user as owner.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @returns {Function} An Express middleware function.
//  */
// exports.newOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     console.log(req.user);
//     // The owner is ALWAYS the authenticated user creating the document.
//     // Super admins cannot override this via req.body.owner for creation.
//     const ownerIdToAssign = req.user._id;

//     const doc = await Model.create({
//       ...req.body, // Spread existing request body
//       owner: ownerIdToAssign // Crucial: Assign the owner, req.user._id is available here
//     });

//     if (!doc) {
//       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
//     }

//     res.status(201).json({
//       status: "success",
//       statusCode: 200,
//       data: doc, // Directly return the doc, no need for nested `data` object
//     });
//   });

// /**
//  * Generic factory handler for getting a single document by ID and owner.
//  * Allows super admins to get any document, otherwise gets by ID and owner.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @param {string|object} [autoPopulateOptions] Options for Mongoose populate.
//  * @returns {Function} An Express middleware function.
//  */
// exports.getOne = (Model, autoPopulateOptions) =>
//   catchAsync(async (req, res, next) => {
//     const userId = req.user._id;
//     const isSuperAdmin = req.user.role === 'superAdmin';

//     let filter = { _id: req.params.id };
//     if (!isSuperAdmin) {
//       filter.owner = userId; // Add owner filter if not super admin
//     }

//     let query = Model.findOne(filter);

//     if (autoPopulateOptions) {
//       query = query.populate(autoPopulateOptions);
//     }

//     const doc = await query;

//     if (!doc) {
//       return next(
//         new AppError(
//           `${Model.modelName} not found with Id ${req.params.id}` +
//           (!isSuperAdmin ? ' or you do not have permission.' : '.'), // Clarify message for non-admins
//           404
//         )
//       );
//     }

//     res.status(200).json({
//       status: "success",
//       statusCode: 200,
//       data: doc,
//     });
//   });

// /**
//  * Generic factory handler for getting all documents.
//  * Allows super admins to get all documents across all owners, otherwise gets documents for the current user.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @returns {Function} An Express middleware function.
//  */
// exports.getAll = (Model) =>
//   catchAsync(async (req, res, next) => {
//     console.log(req.user.role)

//     const userId = req.user._id;
//     const isSuperAdmin = req.user.role === 'superAdmin';

//     let baseFilter = {}; // Default to empty filter for super admin
//     if (!isSuperAdmin) {
//       baseFilter = { owner: userId }; // Apply owner filter for regular users
//     }

//     // Combine base filter (owner or no owner) with additional filters from query
//     // This combinedFilter is now the *only* filter passed to ApiFeatures' queryString
//     const combinedFilter = {
//       ...baseFilter,
//       ...req.query, // Filters from URL query params (e.g., /api/products?status=active)
//     };

//     // MODIFIED LINE: Pass Model.find() without initial filter,
//     // and let ApiFeatures handle the full filter construction.
//     const features = new ApiFeatures(Model.find(), combinedFilter)
//       .filter() // ApiFeatures will now apply the combinedFilter
//       .sort()
//       .limitFields()
//       .paginate();

//     const docs = await features.query;

//     res.status(200).json({
//       status: "success",
//       statusCode: 200,
//       results: docs.length,
//       data: docs,
//     });
//   });

// /**
//  * Generic factory handler for deleting multiple documents by IDs.
//  * Allows super admins to delete any documents matching the IDs, otherwise deletes documents matching IDs and owner.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @returns {Function} An Express middleware function.
//  */
// exports.deleteMultipleProduct = (Model) => // Recommend renaming this to `deleteMany` for generality
//   catchAsync(async (req, res, next) => {
//     const ids = req.body.ids;
//     const userId = req.user._id;
//     const isSuperAdmin = req.user.role === 'superAdmin';
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return next(new AppError("No valid IDs provided for deletion.", 400));
//     }

//     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
//     if (validIds.length === 0) {
//       return next(new AppError("No valid IDs provided.", 400));
//     }

//     let filter = { _id: { $in: validIds } };
//     if (!isSuperAdmin) {
//       filter.owner = userId; // Add owner filter if not super admin
//     }

//     const result = await Model.deleteMany(filter);

//     if (result.deletedCount === 0) {
//       // Clarify message for non-admins
//       const message = `No ${Model.modelName}s found with the provided IDs` +
//                       (!isSuperAdmin ? ' for your account.' : '.');
//       return next(new AppError(message, 404));
//     }

//     res.status(200).json({
//       status: "success",
//       statusCode: 200,
//       message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
//     });
//   });

// /**
//  * Generic factory handler for fetching dropdown data (select fields).
//  * Allows super admins to fetch dropdown data across all owners, otherwise fetches data for the current user.
//  * Requires the 'protect' middleware to run before this handler in the route.
//  *
//  * @param {Mongoose.Model} Model The Mongoose model.
//  * @param {string[]} fields An array of field names to select (e.g., ['name', 'code']).
//  * @returns {Function} An Express middleware function.
//  */
// exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
//   const userId = req.user._id;
//   const isSuperAdmin = req.user.role === 'superAdmin';

//   try {
//     let filter = {};
//     if (!isSuperAdmin) {
//       filter.owner = userId; 
//     }
//     const documents = await Model.find(filter)
//       .select(fields.join(' ') + ' _id')
//       .lean();
//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       results: documents.length,
//       data: { dropdown: documents },
//     });
//   } catch (error) {
//     console.error("Error fetching dropdown data:", error);
//     return next(new AppError('Failed to fetch dropdown data', 500));
//   }
// });


// // const AppError = require("../Utils/appError");
// // const catchAsync = require("../Utils/catchAsyncModule");
// // const ApiFeatures = require("../Utils/ApiFeatures"); // Assuming this utility handles filters correctly
// // const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// // /**
// //  * Generic factory handler for deleting a single document by ID.
// //  * Allows super admins to delete any document, otherwise deletes by ID and owner.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model (e.g., Customer, Product).
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.deleteOne = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = userId; // Add owner filter if not super admin
// //     }

// //     const doc = await Model.findOneAndDelete(filter);

// //     if (!doc) {
// //       return next(
// //         new AppError(
// //           `${Model.modelName} not found with Id ${req.params.id}` +
// //           (!isSuperAdmin ? ' or you do not have permission.' : '.'), // Clarify message for non-admins
// //           404
// //         )
// //       );
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       message: `${Model.modelName} deleted successfully`,
// //       data: null,
// //     });
// //   });

// // /**
// //  * Generic factory handler for updating a single document by ID.
// //  * Allows super admins to update any document, otherwise updates by ID and owner.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.updateOne = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = userId; // Add owner filter if not super admin
// //     }

// //     const doc = await Model.findOneAndUpdate(
// //       filter,
// //       req.body,
// //       {
// //         new: true, // Return the updated document
// //         runValidators: true, // Run schema validators on update
// //       }
// //     );

// //     if (!doc) {
// //       return next(
// //         new AppError(
// //           `${Model.modelName} not found with Id ${req.params.id}` +
// //           (!isSuperAdmin ? ' or you do not have permission.' : '.'), // Clarify message for non-admins
// //           404
// //         )
// //       );
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       data: doc,
// //     });
// //   });

// // /**
// //  * Generic factory handler for creating a new document, assigning the current user as owner.
// //  * The 'owner' field will ALWAYS be set to the ID of the user who initiated the creation (req.user._id),
// //  * regardless of their role. Super admins cannot assign ownership during creation.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.newOne = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     // The owner is ALWAYS the authenticated user creating the document.
// //     // Super admins cannot override this via req.body.owner for creation.
// //     const ownerIdToAssign = req.user._id;

// //     const doc = await Model.create({
// //       ...req.body,
// //       owner: ownerIdToAssign // Assign the actual creator as the owner
// //     });

// //     if (!doc) {
// //       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
// //     }

// //     res.status(201).json({
// //       status: "success",
// //       statusCode: 200,
// //       data: doc,
// //     });
// //   });

// // /**
// //  * Generic factory handler for getting a single document by ID.
// //  * Allows super admins to get any document, otherwise gets by ID and owner.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @param {string|object} [autoPopulateOptions] Options for Mongoose populate.
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.getOne = (Model, autoPopulateOptions) =>
// //   catchAsync(async (req, res, next) => {
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = userId; // Add owner filter if not super admin
// //     }

// //     let query = Model.findOne(filter);

// //     if (autoPopulateOptions) {
// //       query = query.populate(autoPopulateOptions);
// //     }

// //     const doc = await query;

// //     if (!doc) {
// //       return next(
// //         new AppError(
// //           `${Model.modelName} not found with Id ${req.params.id}` +
// //           (!isSuperAdmin ? ' or you do not have permission.' : '.'), // Clarify message for non-admins
// //           404
// //         )
// //       );
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       data: doc,
// //     });
// //   });

// // /**
// //  * Generic factory handler for getting all documents.
// //  * Allows super admins to get all documents across all owners, otherwise gets documents for the current user.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.getAll = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     console.log(req.user.role)

// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     let baseFilter = {}; // Default to empty filter for super admin
// //     if (!isSuperAdmin) {
// //       baseFilter = { owner: userId }; // Apply owner filter for regular users
// //     }

// //     // Combine base filter (owner or no owner) with additional filters from query
// //     const combinedFilter = {
// //       ...baseFilter,
// //       ...req.query, // Filters from URL query params (e.g., /api/products?status=active)
// //     };

// //     const features = new ApiFeatures(Model.find(combinedFilter), combinedFilter)
// //       .filter()
// //       .sort()
// //       .limitFields()
// //       .paginate();

// //     const docs = await features.query;

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       results: docs.length,
// //       data: docs,
// //     });
// //   });

// // /**
// //  * Generic factory handler for deleting multiple documents by IDs.
// //  * Allows super admins to delete any documents matching the IDs, otherwise deletes documents matching IDs and owner.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.deleteMultipleProduct = (Model) => // Recommend renaming this to `deleteMany` for generality
// //   catchAsync(async (req, res, next) => {
// //     const ids = req.body.ids;
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';
// //     if (!ids || !Array.isArray(ids) || ids.length === 0) {
// //       return next(new AppError("No valid IDs provided for deletion.", 400));
// //     }

// //     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
// //     if (validIds.length === 0) {
// //       return next(new AppError("No valid IDs provided.", 400));
// //     }

// //     let filter = { _id: { $in: validIds } };
// //     if (!isSuperAdmin) {
// //       filter.owner = userId; // Add owner filter if not super admin
// //     }

// //     const result = await Model.deleteMany(filter);

// //     if (result.deletedCount === 0) {
// //       // Clarify message for non-admins
// //       const message = `No ${Model.modelName}s found with the provided IDs` +
// //                       (!isSuperAdmin ? ' for your account.' : '.');
// //       return next(new AppError(message, 404));
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
// //     });
// //   });

// // /**
// //  * Generic factory handler for fetching dropdown data (select fields).
// //  * Allows super admins to fetch dropdown data across all owners, otherwise fetches data for the current user.
// //  * Requires the 'protect' middleware to run before this handler in the route.
// //  *
// //  * @param {Mongoose.Model} Model The Mongoose model.
// //  * @param {string[]} fields An array of field names to select (e.g., ['name', 'code']).
// //  * @returns {Function} An Express middleware function.
// //  */
// // exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
// //   const userId = req.user._id;
// //   const isSuperAdmin = req.user.role === 'superAdmin';

// //   try {
// //     let filter = {}; // Default to empty filter for super admin
// //     if (!isSuperAdmin) {
// //       filter.owner = userId; // Apply owner filter for regular users
// //     }

// //     const documents = await Model.find(filter)
// //       .select(fields.join(' ') + ' _id')
// //       .lean();

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       results: documents.length,
// //       data: { dropdown: documents },
// //     });
// //   } catch (error) {
// //     console.error("Error fetching dropdown data:", error);
// //     return next(new AppError('Failed to fetch dropdown data', 500));
// //   }
// // });

// // // const AppError = require("../Utils/appError");
// // // const catchAsync = require("../Utils/catchAsyncModule");
// // // const ApiFeatures = require("../Utils/ApiFeatures"); // Assuming this utility handles filters correctly
// // // const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// // // /**
// // //  * Generic factory handler for deleting a single document by ID and owner.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model (e.g., Customer, Product).
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.deleteOne = (Model) =>
// // //   catchAsync(async (req, res, next) => {
// // //     // Ensure the document belongs to the authenticated user before deleting
// // //     const doc = await Model.findOneAndDelete({
// // //       _id: req.params.id,
// // //       owner: req.user._id // Crucial: Filter by owner, req.user._id is available here
// // //     });

// // //     if (!doc) {
// // //       // If doc is not found, it means either the ID is wrong, or it doesn't belong to the user
// // //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id} or you do not have permission.`, 404));
// // //     }

// // //     res.status(200).json({
// // //       status: "success",
// // //       statusCode: 200,
// // //       message: `${Model.modelName} deleted successfully`,
// // //       data: null,
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for updating a single document by ID and owner.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.updateOne = (Model) =>
// // //   catchAsync(async (req, res, next) => {
// // //     // Ensure the document belongs to the authenticated user before updating
// // //     const doc = await Model.findOneAndUpdate(
// // //       {
// // //         _id: req.params.id,
// // //         owner: req.user._id // Crucial: Filter by owner, req.user._id is available here
// // //       },
// // //       req.body,
// // //       {
// // //         new: true, // Return the updated document
// // //         runValidators: true, // Run schema validators on update
// // //       }
// // //     );

// // //     if (!doc) {
// // //       // If doc is not found, it means either the ID is wrong, or it doesn't belong to the user
// // //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id} or you do not have permission.`, 404));
// // //     }

// // //     res.status(200).json({ // Changed status to 200 for successful update
// // //       status: "success",
// // //       statusCode: 200,
// // //       data: doc,
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for creating a new document, assigning the current user as owner.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.newOne = (Model) =>
// // //   catchAsync(async (req, res, next) => {
// // //     // Create new document, automatically assigning the authenticated user as owner
// // //     const doc = await Model.create({
// // //       ...req.body, // Spread existing request body
// // //       owner: req.user._id // Crucial: Assign the owner, req.user._id is available here
// // //     });

// // //     if (!doc) {
// // //       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
// // //     }

// // //     res.status(201).json({
// // //       status: "success",
// // //       statusCode: 200,
// // //       data: doc, // Directly return the doc, no need for nested `data` object
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for getting a single document by ID and owner.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @param {string|object} [autoPopulateOptions] Options for Mongoose populate.
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.getOne = (Model, autoPopulateOptions) =>
// // //   catchAsync(async (req, res, next) => {
// // //     // Build query to find document by ID AND ensure it belongs to the authenticated user
// // //     let query = Model.findOne({
// // //       _id: req.params.id,
// // //       owner: req.user._id // Crucial: Filter by owner, req.user._id is available here
// // //     });

// // //     // Optional: Allow admin to bypass owner filter
// // //     // if (req.user.role === 'admin') {
// // //     //    query = Model.findById(req.params.id); // Admin can access any document by ID
// // //     // }

// // //     if (autoPopulateOptions) {
// // //       query = query.populate(autoPopulateOptions);
// // //     }

// // //     const doc = await query;

// // //     if (!doc) {
// // //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id} or you do not have permission.`, 404));
// // //     }

// // //     res.status(200).json({
// // //       status: "success",
// // //       statusCode: 200,
// // //       data: doc,
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for getting all documents for the authenticated user.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.getAll = (Model) => // Removed the `options` parameter here
// // //   catchAsync(async (req, res, next) => {
// // //     // Initial filter will always include the owner ID
// // //     let filter = { owner: req.user._id }; // req.user._id is available here

// // //     // Optional: Allow admin to bypass owner filter
// // //     // if (req.user.role === 'admin') {
// // //     //    filter = {}; // Admins can see all documents
// // //     // }

// // //     // Combine current user's filter with any additional filters from query
// // //     const combinedFilter = {
// // //       ...filter,
// // //       ...req.query, // Filters from URL query params (e.g., /api/products?name=Laptop)
// // //       // Removed `...req.body` as filters for GET requests typically come from query params
// // //     };

// // //     const features = new ApiFeatures(Model.find(combinedFilter), combinedFilter) // Pass combinedFilter to ApiFeatures
// // //       .filter() // ApiFeatures should intelligently apply filters
// // //       .sort()
// // //       .limitFields()
// // //       .paginate();

// // //     const docs = await features.query;

// // //     res.status(200).json({
// // //       status: "success",
// // //       statusCode: 200,
// // //       results: docs.length,
// // //       data: docs,
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for deleting multiple documents by IDs and owner.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.deleteMultipleProduct = (Model) => // Consider renaming to `deleteMany` for generality
// // //   catchAsync(async (req, res, next) => {
// // //     const ids = req.body.ids;
// // //     const userId = req.user._id; // Get the authenticated user's ID

// // //     if (!ids || !Array.isArray(ids) || ids.length === 0) {
// // //       return next(new AppError("No valid IDs provided for deletion.", 400));
// // //     }

// // //     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
// // //     if (validIds.length === 0) {
// // //       return next(new AppError("No valid IDs provided.", 400));
// // //     }

// // //     // Delete documents by IDs AND ensure they belong to the current user
// // //     const result = await Model.deleteMany({
// // //       _id: { $in: validIds },
// // //       owner: userId // Crucial: Filter by owner
// // //     });

// // //     if (result.deletedCount === 0) {
// // //       return next(new AppError(`No ${Model.modelName}s found for your account with the provided IDs.`, 404));
// // //     }

// // //     res.status(200).json({
// // //       status: "success",
// // //       statusCode: 200,
// // //       message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
// // //     });
// // //   });

// // // /**
// // //  * Generic factory handler for fetching dropdown data (select fields) for the authenticated user.
// // //  * Requires the 'protect' middleware to run before this handler in the route.
// // //  *
// // //  * @param {Mongoose.Model} Model The Mongoose model.
// // //  * @param {string[]} fields An array of field names to select (e.g., ['name', 'code']).
// // //  * @returns {Function} An Express middleware function.
// // //  */
// // // exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
// // //   const userId = req.user._id; // Get the authenticated user's ID
// // //   try {
// // //     // Find documents where the 'owner' field matches the authenticated user's ID
// // //     const documents = await Model.find({ owner: userId }) // Crucial: Filter by owner
// // //       .select(fields.join(' ') + ' _id') // Select specified fields and _id
// // //       .lean(); // Return plain JavaScript objects for performance

// // //     res.status(200).json({
// // //       status: 'success',
// // //       statusCode: 200,
// // //       results: documents.length,
// // //       data: { dropdown: documents },
// // //     });
// // //   } catch (error) {
// // //     console.error("Error fetching dropdown data:", error); // Log the actual error
// // //     return next(new AppError('Failed to fetch dropdown data', 500));
// // //   }
// // // });

// // // // const AppError = require("../Utils/appError");
// // // // const catchAsync = require("../Utils/catchAsyncModule");
// // // // const ApiFeatures = require("../Utils/ApiFeatures");

// // // // exports.deleteOne = (Model) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     const doc = await Model.findByIdAndDelete(req.params.id);
// // // //     if (!doc) {
// // // //       return next(new AppError(`${Model} not found with Id`, 404));
// // // //     }
// // // //     res.status(200).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       message: `${Model} deleted successfully`,
// // // //       data: null,
// // // //     });
// // // //   });

// // // // exports.updateOne = (Model) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
// // // //       new: true,
// // // //       runValidators: true,
// // // //     });
// // // //     if (!doc) {
// // // //       return next(new AppError(` ${Model} not found with Id ${req.params.id}`, 404));
// // // //     }
// // // //     res.status(201).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       data: doc,
// // // //     });
// // // //   });

// // // // exports.newOne = (Model) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     const doc = await Model.create(req.body);
// // // //     if (!doc) {
// // // //       return next(new AppError(` Failed to create ${Model}`, 400));
// // // //     }
// // // //     res.status(201).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       data: {
// // // //         data: doc,
// // // //       },
// // // //     });
// // // //   });

// // // // exports.getOne = (Model, autoPopulateOptions) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     let query = Model.findById(req.params.id);
// // // //     if (autoPopulateOptions) {
// // // //       query.populate(autoPopulateOptions);
// // // //     }
// // // //     const doc = await query;
// // // //     if (!doc) {
// // // //       return next(new AppError(`${Model} not found with Id`, 404));
// // // //     }
// // // //     res.status(200).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       data: doc,
// // // //     });
// // // //   });

// // // // exports.getAll = (Model) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     // Combine query parameters and request body for filtering
// // // //     const filterParams = {
// // // //       ...req.query,
// // // //       ...req.body
// // // //     };

// // // //     const features = new ApiFeatures(Model.find(), filterParams)
// // // //       .filter()
// // // //       .sort()
// // // //       .limitFields()
// // // //       .paginate();
// // // //     const docs = await features.query;
// // // //     res.status(200).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       results: docs.length,
// // // //       data: docs,
// // // //     });
// // // //   });
// // // // // utils/handleFactory.js

// // // // // exports.getAll = (Model, options = {}) =>
// // // // //   catchAsync(async (req, res, next) => {
// // // // //     const filterParams = {
// // // // //       ...req.query,
// // // // //       ...req.body
// // // // //     };

// // // // //     const features = new ApiFeatures(Model.find(), filterParams)
// // // // //       .filter()
// // // // //       .sort()
// // // // //       .limitFields()
// // // // //       .paginate();

// // // // //     let docs = await features.query;

// // // // //     // ✅ Optional post-processing hook (e.g., enrich customer data)
// // // // //     if (options.afterEach && typeof options.afterEach === 'function') {
// // // // //       docs = await Promise.all(
// // // // //         docs.map(async (doc) => await options.afterEach(doc))
// // // // //       );
// // // // //     }

// // // // //     res.status(200).json({
// // // // //       status: "success",
// // // // //       statusCode: 200,
// // // // //       results: docs.length,
// // // // //       data: docs,
// // // // //     });
// // // // //   });

  
// // // // exports.deleteMultipleProduct = (Model) =>
// // // //   catchAsync(async (req, res, next) => {
// // // //     const ids = req.body.ids;
// // // //     if (!ids || !Array.isArray(ids) || ids.length === 0) {
// // // //       return next(new AppError("No valid IDs provided for deletion.", 400));
// // // //     }

// // // //     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
// // // //     if (validIds.length === 0) {
// // // //       return next(new AppError("No valid IDs provided.", 400));
// // // //     }

// // // //     const result = await Model.deleteMany({ _id: { $in: validIds } });
// // // //     if (result.deletedCount === 0) {
// // // //       return next(new AppError(`No ${Model} found with the provided IDs.`, 404));
// // // //     }

// // // //     res.status(200).json({
// // // //       status: "success",
// // // //       statusCode: 200,
// // // //       message: `${result.deletedCount} ${Model} deleted successfully.`,
// // // //     });
// // // //   });

// // // // exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
// // // //   try {
// // // //     const documents = await Model.find()
// // // //       .select(fields.join(' ') + ' _id')
// // // //       .lean();

// // // //     res.status(200).json({
// // // //       status: 'success',
// // // //       statusCode: 200,
// // // //       results: documents.length,
// // // //       data: { dropdown: documents },
// // // //     });
// // // //   } catch (error) {
// // // //     return next(new AppError('Failed to fetch dropdown data', 500));
// // // //   }
// // // // });

// // // // // exports.deleteOne = (Model) =>
// // // // //   catchAsync(async (req, res, next) => {
// // // // //     const doc = await Model.findByIdAndDelete(req.params.id);
// // // // //     if (!doc) {
// // // // //       return next(new AppError(`${Model} not found with Id`, 404));
// // // // //     }
// // // // //     res.status(200).json({
// // // // //       Status: "success",
// // // // // statusCode: 200,
// // // // //       message: "Data deleted successfully",
// // // // //       data: null,
// // // // //     });
// // // // //   });

// // // // //   // exports.deleteMany = (Model) =>
// // // // //   // catchAsync(async (req, res, next) => {
// // // // //   //   try {
// // // // //   //     // 1. Get the IDs from the request (e.g., from the request body)
// // // // //   //     const idsToDelete = req.body.ids; // Assuming you send an array of IDs in the body
// // // // //   //     console.log(req.dody)

// // // // //   //     // 2. Validate the IDs (important!)
// // // // //   //     if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
// // // // //   //       return next(new AppError("No IDs provided for deletion.", 400)); // Bad Request
// // // // //   //     }

// // // // //   //     // Convert string IDs to ObjectIds (if necessary)
// // // // //   //     const objectIds = idsToDelete.map(id => {
// // // // //   //       try {
// // // // //   //         return new mongoose.Types.ObjectId(id); // Attempt conversion
// // // // //   //       } catch (error) {
// // // // //   //         return null; // Handle invalid IDs
// // // // //   //       }
// // // // //   //     }).filter(id => id !== null); //remove null from array if any invalid id

// // // // //   //     if (objectIds.length !== idsToDelete.length) {
// // // // //   //       return next(new AppError("Invalid IDs provided for deletion.", 400));
// // // // //   //     }

// // // // //   //     // 3. Delete the documents using deleteMany
// // // // //   //     const result = await Model.deleteMany({ _id: { $in: objectIds } });

// // // // //   //     if (result.deletedCount === 0) {
// // // // //   //       return next(new AppError("No documents found with the provided IDs.", 404));
// // // // //   //     }

// // // // //   //     // 4. Send a success response
// // // // //   //     res.status(200).json({
// // // // //   //       status: "success",
// // // // // statusCode: 200,
// // // // //   //       message: `${result.deletedCount} documents deleted successfully.`,
// // // // //   //       data: null, // Important for security
// // // // //   //     });
// // // // //   //   } catch (err) {
// // // // //   //     next(err); // Pass any errors to the error handling middleware
// // // // //   //   }
// // // // //   // });


// // // // // exports.updateOne = (Model) =>
// // // // //   catchAsync(async (req, res, next) => {
// // // // //     const doc = await Model.findByIdAndUpdate(req.params.id, req.body);
// // // // //     if (!doc) {
// // // // //       return next(new AppError(`doc not found with Id ${req.params.id}`, 404));
// // // // //     }
// // // // //     res.status(201).json({
// // // // //       status: "Success",
// // // // // statusCode: 200,
// // // // //       data: doc,
// // // // //     });
// // // // //   });

// // // // // exports.newOne = (Model) =>
// // // // //   catchAsync(async (req, res, next) => {
// // // // //     console.log(req);
// // // // //     const doc = await Model.create(req.body);
// // // // //     if (!doc) {
// // // // //       return next(new AppError("Failed to create product", 400));
// // // // //     }
// // // // //     res.status(201).json({
// // // // //       status: "success",
// // // // // statusCode: 200,
// // // // //       data: {
// // // // //         data: doc,
// // // // //       },
// // // // //     });
// // // // //   });

// // // // // exports.getOne = (Model, autoPopulateOptions) => {
// // // // //   return catchAsync(async (req, res, next) => {
// // // // //     let query = Model.findById(req.params.id);
// // // // //     if (autoPopulateOptions) {
// // // // //       query.populate(autoPopulateOptions);
// // // // //     }
// // // // //     const doc = await query;
// // // // //     // const doc = await Model.findById(req.params.id).populate(autoPopulateOptions);;
// // // // //     if (!doc) {
// // // // //       return next(new AppError("doc not found with Id", 404));
// // // // //     }
// // // // //     res.status(200).json({
// // // // //       status: "success",
// // // // // statusCode: 200,
// // // // //       length: doc.length,
// // // // //       data: doc,
// // // // //     });
// // // // //   });
// // // // // };

// // // // // exports.getAll = (Model, autoPopulateOptions) => {
// // // // //   return catchAsync(async (req, res, next) => {
// // // // //     console.log(req);
// // // // //     // small hack for nested routing
// // // // //     let filter = {};
// // // // //     if (req.params.productId) filter = { product: req.params.productID };

// // // // //     if (autoPopulateOptions) {
// // // // //       feature = new ApiFeatures(
// // // // //         Model.find(filter).populate(autoPopulateOptions),
// // // // //         req.query
// // // // //       );
// // // // //     } else {
// // // // //       feature = new ApiFeatures(Model.find(), req.query);
// // // // //     }
// // // // //     const data = feature.filter().limitFields().sort().paginate();
// // // // //     const doc = await data.query;
// // // // //     // const doc = await data.query.explain();
// // // // //     res.status(200).json({
// // // // //       status: "success",
// // // // // statusCode: 200,
// // // // //       result: doc.length,
// // // // //       data: { doc },
// // // // //     });
// // // // //   });
// // // // // };

// // // // // exports.createList = (Model, keys) => {
// // // // //   return catchAsync(async (req, res, next) => {
// // // // //     let aggregationPipeline = [];

// // // // //     // Project stage (select only the specified keys/fields)
// // // // //     if (keys && Array.isArray(keys) && keys.length > 0) {
// // // // //       const projection = keys.reduce((acc, key) => {
// // // // //         acc[key] = 1; // Include the specified fields in the result
// // // // //         return acc;
// // // // //       }, {});
// // // // //       aggregationPipeline.push({ $project: projection });
// // // // //     }

// // // // //     // Execute the aggregation pipeline
// // // // //     const docs = await Model.aggregate(aggregationPipeline);

// // // // //     // If no documents are found
// // // // //     if (!docs || docs.length === 0) {
// // // // //       return next(new AppError("No documents found", 404));
// // // // //     }

// // // // //     // Respond with the results
// // // // //     res.status(200).json({
// // // // //       status: "success",
// // // // // statusCode: 200,
// // // // //       result: docs.length,
// // // // //       data: docs,
// // // // //     });
// // // // //   });
// // // // // };


// // // // // // exports.deleteMultipleProduct= (model) =>{
// // // // // //   return catchAsync(async (req, res, next) => {
// // // // // //     console.log(req.body,"------------------------------------------");
// // // // // //     // const result = await model.deleteMany({ _id: { $in: idsToDelete } });
// // // // // //     console.log(`${result.deletedCount} documents deleted successfully.`);
// // // // // //     console.error('Error deleting documents:', error);
// // // // // // })
// // // // // // }
// // // // // exports.deleteMultipleProduct = (model) => {
// // // // //   return catchAsync(async (req, res, next) => {
// // // // //     try {
// // // // //       const ids = req.body.ids;

// // // // //       // Validate that the IDs array is provided
// // // // //       if (!ids || !Array.isArray(ids) || ids.length === 0) {
// // // // //         return res.status(400).json({
// // // // //           status: "fail",
// // // // //
// // // // // statusCode:200,           message: "No valid IDs provided.",
// // // // //         });
// // // // //       }

// // // // //       // Use deleteMany to delete documents with the given IDs
// // // // //       const result = await model.deleteMany({ _id: { $in: ids } });

// // // // //       if (result.deletedCount > 0) {
// // // // //         return res.status(200).json({
// // // // //           status: "success",
// // // // // statusCode: 200,
// // // // //           message: `${result.deletedCount} documents deleted successfully.`,
// // // // //         });
// // // // //       } else {
// // // // //         return res.status(404).json({
// // // // //           status: "fail",
// // // // //
// // // // // statusCode:200,           message: "No documents found with the given IDs.",
// // // // //         });
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error deleting documents:", error);
// // // // //       next(error); // Pass error to global error handler
// // // // //     }
// // // // //   });
// // // // // };
