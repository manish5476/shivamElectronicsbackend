const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const ApiFeatures = require("../Utils/ApiFeatures");
const mongoose = require('mongoose');
// Define to avoid ReferenceError, only used if specified in a call
const autoPopulateOptions = {};
/**
 * @description Creates a single document OR multiple documents based on req.body.
 * @param {Model} Model - The Mongoose model.
 * @expects req.body to be a single object OR an array of objects.
 */
exports.create = (Model) =>
    catchAsync(async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required to perform this action.', 401));
        }
        const ownerIdToAssign = req.user._id;
        let data = req.body;
        let isBulk = Array.isArray(data);

        if (isBulk) {
             if (data.length === 0) {
                return next(new AppError('Request body must be a non-empty array of documents.', 400));
            }
            data = data.map(item => ({ ...item, owner: ownerIdToAssign }));
        } else {
            data.owner = ownerIdToAssign;
        }

        const docs = await Model.create(data);

        res.status(201).json({
            status: "success",
            statusCode: 201,
            results: isBulk ? docs.length : undefined,
            data: docs,
        });
    });

/**
 * @description Updates a single document (by ID in URL) OR multiple documents (by array in body).
 * @param {Model} Model - The Mongoose model.
 * @expects EITHER req.params.id with update data in req.body
 * OR req.body to be an array like [{ "_id": "...", "updateData": { ... } }]
 */
exports.update = (Model) =>
    catchAsync(async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required to perform this action.', 401));
        }
        
        const userId = req.user._id;
        const isSuperAdmin = req.user.role === 'superAdmin';

        // CASE 1: Single document update (ID from URL)
        if (req.params.id) {
            let filter = { _id: req.params.id };
            if (!isSuperAdmin) filter.owner = userId;

            const doc = await Model.findOneAndUpdate(filter, req.body, {
                new: true,
                runValidators: true,
            });

            if (!doc) {
                return next(new AppError(`${Model.modelName} not found or you lack permission.`, 404));
            }
            return res.status(200).json({ status: "success", data: doc });
        }

        // CASE 2: Bulk document update (Array from body)
        const updates = req.body;
        if (Array.isArray(updates)) {
            if (updates.length === 0) {
                 return next(new AppError('Request body must be a non-empty array of update operations.', 400));
            }
            const bulkOps = updates.map(item => {
                if (!item._id || !item.updateData) return null;
                let filter = { _id: item._id };
                if (!isSuperAdmin) filter.owner = userId;
                return { update: { filter, update: { $set: item.updateData } } };
            }).filter(Boolean);

            if (bulkOps.length === 0) {
                return next(new AppError('No valid update operations provided.', 400));
            }
            
            const result = await Model.bulkWrite(bulkOps);

            if (result.modifiedCount === 0) {
                return next(new AppError(`No ${Model.modelName}s were updated.`, 404));
            }
            
            return res.status(200).json({
                status: "success",
                message: `${result.modifiedCount} ${Model.modelName}(s) updated successfully.`,
            });
        }
        
        return next(new AppError('Invalid request. Provide an ID in the URL for a single update, or an array in the body for bulk updates.', 400));
    });

/**
 * @description Deletes a single document (by ID in URL) OR multiple documents (by array of IDs in body).
 * @param {Model} Model - The Mongoose model.
 * @expects EITHER req.params.id OR req.body to be an object like { "ids": ["...", "..."] }
 */
exports.delete = (Model) =>
    catchAsync(async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required to perform this action.', 401));
        }

        const userId = req.user._id;
        const isSuperAdmin = req.user.role === 'superAdmin';

        // CASE 1: Single document delete (ID from URL)
        if (req.params.id) {
            let filter = { _id: req.params.id };
            if (!isSuperAdmin) filter.owner = userId;

            const doc = await Model.findOneAndDelete(filter);
            if (!doc) {
                return next(new AppError(`${Model.modelName} not found or you lack permission.`, 404));
            }
            return res.status(200).json({ status: "success", message: `${Model.modelName} deleted successfully.`, data: null });
        }

        // CASE 2: Bulk document delete (Array of IDs from body)
        const { ids } = req.body;
        if (ids && Array.isArray(ids)) {
             if (ids.length === 0) {
                return next(new AppError('The "ids" array cannot be empty.', 400));
            }
            let filter = { _id: { $in: ids } };
            if (!isSuperAdmin) filter.owner = userId;

            const result = await Model.deleteMany(filter);
            if (result.deletedCount === 0) {
                return next(new AppError(`No ${Model.modelName}s found with the provided IDs.`, 404));
            }
            return res.status(200).json({
                status: "success",
                message: `${result.deletedCount} ${Model.modelName}(s) deleted successfully.`,
            });
        }
        
        return next(new AppError('Invalid request. Provide an ID in the URL for a single delete, or an "ids" array in the body for bulk deletes.', 400));
    });

// --- Read operations remain unchanged ---

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        // ... (existing getOne code is perfect)
        if (!req.user) {
            return next(new AppError('Authentication required to perform this action.', 401));
        }
        const isSuperAdmin = req.user.role === 'superAdmin';
        let filter = { _id: req.params.id };
        if (!isSuperAdmin) {
            filter.owner = req.user._id;
        }

        let query = Model.findOne(filter);

        if (populateOptions) {
            query = query.populate(populateOptions);
        } else if (Object.keys(autoPopulateOptions).length > 0) {
            query = query.populate(autoPopulateOptions);
        }

        const doc = await query;

        if (!doc) {
            return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
                (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
        }

        res.status(200).json({
            status: "success",
            data: doc,
        });
    });

exports.getAll = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        // ... (existing getAll code is perfect)
        if (!req.user) {
            return next(new AppError('Authentication required to perform this action.', 401));
        }
        const userId = req.user._id;
        const isSuperAdmin = req.user.role === 'superAdmin';

        let baseFilter = {};
        if (!isSuperAdmin) {
            baseFilter = { owner: userId };
        }

        const features = new ApiFeatures(Model.find(baseFilter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();

        let query = features.query;

        if (populateOptions) {
            query = query.populate(populateOptions);
        } else if (Object.keys(autoPopulateOptions).length > 0) {
            query = query.populate(autoPopulateOptions);
        }

        const doc = await query;

        res.status(200).json({
            status: "success",
            results: doc.length,
            data: doc,
        });
    });
    
// const AppError = require("../Utils/appError");
// const catchAsync = require("../Utils/catchAsyncModule");
// const ApiFeatures = require("../Utils/ApiFeatures");
// const mongoose = require('mongoose');

// // Define to avoid ReferenceError, only used if specified in a call
// const autoPopulateOptions = {};

// /**
//  * @description Creates multiple documents in a single operation.
//  * @param {Model} Model - The Mongoose model to create documents for.
//  * @expects req.body to be an array of objects, e.g., [{...doc1}, {...doc2}]
//  */
// exports.createMany = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const data = req.body;

//         if (!Array.isArray(data) || data.length === 0) {
//             return next(new AppError('Request body must be a non-empty array of documents.', 400));
//         }

//         const ownerIdToAssign = req.user._id;
//         // Assign the owner to each document before creation
//         const dataWithOwners = data.map(item => ({
//             ...item,
//             owner: ownerIdToAssign
//         }));

//         const docs = await Model.create(dataWithOwners);

//         res.status(201).json({
//             status: "success",
//             statusCode: 201,
//             results: docs.length,
//             data: docs,
//         });
//     });

// /**
//  * @description Updates multiple documents in a single operation using bulkWrite.
//  * @param {Model} Model - The Mongoose model to update documents for.
//  * @expects req.body to be an array of objects, each with an _id and updateData field.
//  * e.g., [{ "_id": "...", "updateData": { "status": "active" } }]
//  */
// exports.updateMany = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const updates = req.body;
//         const userId = req.user._id;
//         const isSuperAdmin = req.user.role === 'superAdmin';

//         if (!Array.isArray(updates) || updates.length === 0) {
//             return next(new AppError('Request body must be a non-empty array of update operations.', 400));
//         }

//         const bulkOps = updates.map(item => {
//             if (!item._id || !item.updateData) {
//                 // You could throw an error or just skip invalid items
//                 return null;
//             }

//             let filter = { _id: item._id };
//             // Ensure non-superAdmins can only update their own documents
//             if (!isSuperAdmin) {
//                 filter.owner = userId;
//             }

//             return {
//                 update: {
//                     filter: filter,
//                     update: { $set: item.updateData },
//                 }
//             };
//         }).filter(op => op !== null); // Filter out any invalid items

//         if (bulkOps.length === 0) {
//             return next(new AppError('No valid update operations provided.', 400));
//         }

//         const result = await Model.bulkWrite(bulkOps);

//         if (result.modifiedCount === 0) {
//             return next(new AppError(`No ${Model.modelName}s were updated. They may not exist or you lack permission.`, 404));
//         }

//         res.status(200).json({
//             status: "success",
//             statusCode: 200,
//             message: `${result.modifiedCount} ${Model.modelName}(s) updated successfully.`,
//         });
//     });


// exports.create = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const ownerIdToAssign = req.user._id;
//         const doc = await Model.create({
//             ...req.body,
//             owner: ownerIdToAssign
//         });

//         if (!doc) {
//             return next(new AppError(`Failed to create ${Model.modelName}`, 400));
//         }
//         res.status(201).json({
//             status: "success",
//             statusCode: 201,
//             data: doc,
//         });
//     });


// exports.delete = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const isSuperAdmin = req.user.role === 'superAdmin';
//         let filter = { _id: req.params.id };
//         if (!isSuperAdmin) {
//             filter.owner = req.user._id;
//         }

//         const doc = await Model.findOneAndDelete(filter);

//         if (!doc) {
//             return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
//                 (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
//         }

//         res.status(200).json({
//             status: "success",
//             statusCode: 200,
//             message: `${Model.modelName} deleted successfully`,
//             data: null,
//         });
//     });


// exports.update = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const isSuperAdmin = req.user.role === 'superAdmin';
//         let filter = { _id: req.params.id };
//         if (!isSuperAdmin) {
//             filter.owner = req.user._id;
//         }

//         const doc = await Model.findOneAndUpdate(
//             filter,
//             req.body, {
//                 new: true,
//                 runValidators: true,
//             }
//         );

//         if (!doc) {
//             return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
//                 (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
//         }

//         res.status(200).json({
//             status: "success",
//             statusCode: 200,
//             data: doc,
//         });
//     });

// exports.getOne = (Model, populateOptions) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const isSuperAdmin = req.user.role === 'superAdmin';
//         let filter = { _id: req.params.id };
//         if (!isSuperAdmin) {
//             filter.owner = req.user._id;
//         }

//         let query = Model.findOne(filter);

//         if (populateOptions) {
//             query = query.populate(populateOptions);
//         } else if (Object.keys(autoPopulateOptions).length > 0) {
//             query = query.populate(autoPopulateOptions);
//         }

//         const doc = await query;

//         if (!doc) {
//             return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
//                 (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
//         }

//         res.status(200).json({
//             status: "success",
//             data: doc,
//         });
//     });

// exports.getAll = (Model, populateOptions) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const userId = req.user._id;
//         const isSuperAdmin = req.user.role === 'superAdmin';

//         let baseFilter = {};
//         if (!isSuperAdmin) {
//             baseFilter = { owner: userId };
//         }

//         const features = new ApiFeatures(Model.find(baseFilter), req.query)
//             .filter()
//             .sort()
//             .limitFields()
//             .paginate();

//         let query = features.query;

//         if (populateOptions) {
//             query = query.populate(populateOptions);
//         } else if (Object.keys(autoPopulateOptions).length > 0) {
//             query = query.populate(autoPopulateOptions);
//         }

//         const doc = await query;

//         res.status(200).json({
//             status: "success",
//             results: doc.length,
//             data: doc,
//         });
//     });

// exports.deleteMany = (Model) =>
//     catchAsync(async (req, res, next) => {
//         if (!req.user) {
//             return next(new AppError('Authentication required to perform this action.', 401));
//         }
//         const ids = req.body.ids;
//         const userId = req.user._id;
//         const isSuperAdmin = req.user.role === 'superAdmin';

//         if (!ids || !Array.isArray(ids) || ids.length === 0) {
//             return next(new AppError("No valid IDs provided for deletion.", 400));
//         }

//         const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
//         if (validIds.length === 0) {
//             return next(new AppError("No valid IDs provided.", 400));
//         }

//         let filter = { _id: { $in: validIds } };
//         if (!isSuperAdmin) {
//             filter.owner = userId;
//         }

//         const result = await Model.deleteMany(filter);

//         if (result.deletedCount === 0) {
//             const message = `No ${Model.modelName}s found with the provided IDs` +
//                 (!isSuperAdmin ? ' for your account.' : '.');
//             return next(new AppError(message, 404));
//         }

//         res.status(200).json({
//             status: "success",
//             statusCode: 200,
//             message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
//             data: null,
//         });
//     });

// exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
//     if (!req.user) {
//         return next(new AppError('Authentication required to perform this action.', 401));
//     }
//     const userId = req.user._id;
//     const isSuperAdmin = req.user.role === 'superAdmin';

//     try {
//         let filter = {};
//         if (!isSuperAdmin) {
//             filter.owner = userId;
//         }
//         const documents = await Model.find(filter)
//             .select(fields.join(' ') + ' _id')
//             .lean();

//         res.status(200).json({
//             status: 'success',
//             statusCode: 200,
//             results: documents.length,
//             data: documents,
//         });
//     } catch (error) {
//         console.error("Error fetching dropdown data:", error);
//         return next(new AppError('Failed to fetch dropdown data', 500));
//     }
// });

// // const AppError = require("../Utils/appError");
// // const catchAsync = require("../Utils/catchAsyncModule");
// // const ApiFeatures = require("../Utils/ApiFeatures");
// // const mongoose = require('mongoose');

// // const autoPopulateOptions = {}; // Still define it to avoid ReferenceError, but it will only be used if specified in call

// // exports.delete = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const isSuperAdmin = req.user.role === 'superAdmin';
// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = req.user._id;
// //     }

// //     const doc = await Model.findOneAndDelete(filter);

// //     if (!doc) {
// //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
// //         (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       message: `${Model.modelName} deleted successfully`,
// //       data: null, // As it's a delete operation, data is often null
// //     });
// //   });


// // exports.update = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const isSuperAdmin = req.user.role === 'superAdmin';
// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = req.user._id;
// //     }

// //     const doc = await Model.findOneAndUpdate(
// //       filter,
// //       req.body,
// //       {
// //         new: true,
// //         runValidators: true,
// //       }
// //     );

// //     if (!doc) {
// //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
// //         (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       data: doc, // Directly provide the doc
// //     });
// //   });

// // exports.create = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const ownerIdToAssign = req.user._id;
// //     const doc = await Model.create({
// //       ...req.body,
// //       owner: ownerIdToAssign
// //     });

// //     if (!doc) {
// //       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
// //     }
// //     res.status(201).json({
// //       status: "success",
// //       statusCode: 201,
// //       data: doc, // Directly provide the doc
// //     });
// //   });

// // exports.getOne = (Model, populateOptions) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const isSuperAdmin = req.user.role === 'superAdmin';
// //     let filter = { _id: req.params.id };
// //     if (!isSuperAdmin) {
// //       filter.owner = req.user._id;
// //     }

// //     let query = Model.findOne(filter);

// //     if (populateOptions) {
// //       query = query.populate(populateOptions);
// //     } else if (Object.keys(autoPopulateOptions).length > 0) {
// //       query = query.populate(autoPopulateOptions);
// //     }
 
// //     const doc = await query;
 
// //     if (!doc) {
// //       return next(new AppError(`${Model.modelName} not found with Id ${req.params.id}` +
// //         (!isSuperAdmin ? ' or you do not have permission.' : '.'), 404));
// //     }
 
// //     res.status(200).json({
// //       status: "success",
// //       data: doc, // Changed: Directly provide the doc
// //     });
// //   });
 
// // exports.getAll = (Model, populateOptions) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     let baseFilter = {};
// //     if (!isSuperAdmin) {
// //       baseFilter = { owner: userId };
// //     }

// //     const features = new ApiFeatures(Model.find(baseFilter), req.query)
// //       .filter()
// //       .sort()
// //       .limitFields()
// //       .paginate();

// //     let query = features.query;

// //     if (populateOptions) {
// //       query = query.populate(populateOptions);
// //     } else if (Object.keys(autoPopulateOptions).length > 0) {
// //       query = query.populate(autoPopulateOptions);
// //     }
 
// //     const doc = await query;
 
// //     res.status(200).json({
// //       status: "success",
// //       results: doc.length,
// //       data: doc, // Changed: Directly provide the doc
// //     });
// //   });

// // exports.deleteMany = (Model) =>
// //   catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
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
// //       filter.owner = userId;
// //     }

// //     const result = await Model.deleteMany(filter);

// //     if (result.deletedCount === 0) {
// //       const message = `No ${Model.modelName}s found with the provided IDs` +
// //         (!isSuperAdmin ? ' for your account.' : '.');
// //       return next(new AppError(message, 404));
// //     }

// //     res.status(200).json({
// //       status: "success",
// //       statusCode: 200,
// //       message: `${result.deletedCount} ${Model.modelName}s deleted successfully.`,
// //       data: null, // Data is often null for delete operations
// //     });
// //   });

// // exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
// //     if (!req.user) {
// //         return next(new AppError('Authentication required to perform this action.', 401));
// //     }
// //     const userId = req.user._id;
// //     const isSuperAdmin = req.user.role === 'superAdmin';

// //     try {
// //         let filter = {};
// //         if (!isSuperAdmin) {
// //             filter.owner = userId;
// //         }
// //         const documents = await Model.find(filter)
// //             .select(fields.join(' ') + ' _id')
// //             .lean();

// //         res.status(200).json({
// //             status: 'success',
// //             statusCode: 200,
// //             results: documents.length,
// //             data: documents, // Changed: Directly provide the array of documents
// //         });
// //     } catch (error) {
// //         console.error("Error fetching dropdown data:", error);
// //         return next(new AppError('Failed to fetch dropdown data', 500));
// //     }
// // });