const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsyncModule");
const ApiFeatures = require("../Utils/ApiFeatures");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(`${Model} not found with Id`, 404));
    }
    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `${Model} deleted successfully`,
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError(` ${Model} not found with Id ${req.params.id}`, 404));
    }
    res.status(201).json({
      status: "success",
      statusCode: 200,
      data: doc,
    });
  });

exports.newOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    if (!doc) {
      return next(new AppError(` Failed to create ${Model}`, 400));
    }
    res.status(201).json({
      status: "success",
      statusCode: 200,
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, autoPopulateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (autoPopulateOptions) {
      query.populate(autoPopulateOptions);
    }
    const doc = await query;
    if (!doc) {
      return next(new AppError(`${Model} not found with Id`, 404));
    }
    res.status(200).json({
      status: "success",
      statusCode: 200,
      data: doc,
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Combine query parameters and request body for filtering
    const filterParams = {
      ...req.query,
      ...req.body
    };

    const features = new ApiFeatures(Model.find(), filterParams)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const docs = await features.query;
    res.status(200).json({
      status: "success",
      statusCode: 200,
      results: docs.length,
      data: docs,
    });
  });
// utils/handleFactory.js

// exports.getAll = (Model, options = {}) =>
//   catchAsync(async (req, res, next) => {
//     const filterParams = {
//       ...req.query,
//       ...req.body
//     };

//     const features = new ApiFeatures(Model.find(), filterParams)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();

//     let docs = await features.query;

//     // ✅ Optional post-processing hook (e.g., enrich customer data)
//     if (options.afterEach && typeof options.afterEach === 'function') {
//       docs = await Promise.all(
//         docs.map(async (doc) => await options.afterEach(doc))
//       );
//     }

//     res.status(200).json({
//       status: "success",
//       statusCode: 200,
//       results: docs.length,
//       data: docs,
//     });
//   });

  
exports.deleteMultipleProduct = (Model) =>
  catchAsync(async (req, res, next) => {
    const ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new AppError("No valid IDs provided for deletion.", 400));
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return next(new AppError("No valid IDs provided.", 400));
    }

    const result = await Model.deleteMany({ _id: { $in: validIds } });
    if (result.deletedCount === 0) {
      return next(new AppError(`No ${Model} found with the provided IDs.`, 404));
    }

    res.status(200).json({
      status: "success",
      statusCode: 200,
      message: `${result.deletedCount} ${Model} deleted successfully.`,
    });
  });

exports.getModelDropdownWithoutStatus = (Model, fields) => catchAsync(async (req, res, next) => {
  try {
    const documents = await Model.find()
      .select(fields.join(' ') + ' _id')
      .lean();

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      results: documents.length,
      data: { dropdown: documents },
    });
  } catch (error) {
    return next(new AppError('Failed to fetch dropdown data', 500));
  }
});

// exports.deleteOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.findByIdAndDelete(req.params.id);
//     if (!doc) {
//       return next(new AppError(`${Model} not found with Id`, 404));
//     }
//     res.status(200).json({
//       Status: "success",
// statusCode: 200,
//       message: "Data deleted successfully",
//       data: null,
//     });
//   });

//   // exports.deleteMany = (Model) =>
//   // catchAsync(async (req, res, next) => {
//   //   try {
//   //     // 1. Get the IDs from the request (e.g., from the request body)
//   //     const idsToDelete = req.body.ids; // Assuming you send an array of IDs in the body
//   //     console.log(req.dody)

//   //     // 2. Validate the IDs (important!)
//   //     if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
//   //       return next(new AppError("No IDs provided for deletion.", 400)); // Bad Request
//   //     }

//   //     // Convert string IDs to ObjectIds (if necessary)
//   //     const objectIds = idsToDelete.map(id => {
//   //       try {
//   //         return new mongoose.Types.ObjectId(id); // Attempt conversion
//   //       } catch (error) {
//   //         return null; // Handle invalid IDs
//   //       }
//   //     }).filter(id => id !== null); //remove null from array if any invalid id

//   //     if (objectIds.length !== idsToDelete.length) {
//   //       return next(new AppError("Invalid IDs provided for deletion.", 400));
//   //     }

//   //     // 3. Delete the documents using deleteMany
//   //     const result = await Model.deleteMany({ _id: { $in: objectIds } });

//   //     if (result.deletedCount === 0) {
//   //       return next(new AppError("No documents found with the provided IDs.", 404));
//   //     }

//   //     // 4. Send a success response
//   //     res.status(200).json({
//   //       status: "success",
// statusCode: 200,
//   //       message: `${result.deletedCount} documents deleted successfully.`,
//   //       data: null, // Important for security
//   //     });
//   //   } catch (err) {
//   //     next(err); // Pass any errors to the error handling middleware
//   //   }
//   // });


// exports.updateOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.findByIdAndUpdate(req.params.id, req.body);
//     if (!doc) {
//       return next(new AppError(`doc not found with Id ${req.params.id}`, 404));
//     }
//     res.status(201).json({
//       status: "Success",
// statusCode: 200,
//       data: doc,
//     });
//   });

// exports.newOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     console.log(req);
//     const doc = await Model.create(req.body);
//     if (!doc) {
//       return next(new AppError("Failed to create product", 400));
//     }
//     res.status(201).json({
//       status: "success",
// statusCode: 200,
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.getOne = (Model, autoPopulateOptions) => {
//   return catchAsync(async (req, res, next) => {
//     let query = Model.findById(req.params.id);
//     if (autoPopulateOptions) {
//       query.populate(autoPopulateOptions);
//     }
//     const doc = await query;
//     // const doc = await Model.findById(req.params.id).populate(autoPopulateOptions);;
//     if (!doc) {
//       return next(new AppError("doc not found with Id", 404));
//     }
//     res.status(200).json({
//       status: "success",
// statusCode: 200,
//       length: doc.length,
//       data: doc,
//     });
//   });
// };

// exports.getAll = (Model, autoPopulateOptions) => {
//   return catchAsync(async (req, res, next) => {
//     console.log(req);
//     // small hack for nested routing
//     let filter = {};
//     if (req.params.productId) filter = { product: req.params.productID };

//     if (autoPopulateOptions) {
//       feature = new ApiFeatures(
//         Model.find(filter).populate(autoPopulateOptions),
//         req.query
//       );
//     } else {
//       feature = new ApiFeatures(Model.find(), req.query);
//     }
//     const data = feature.filter().limitFields().sort().paginate();
//     const doc = await data.query;
//     // const doc = await data.query.explain();
//     res.status(200).json({
//       status: "success",
// statusCode: 200,
//       result: doc.length,
//       data: { doc },
//     });
//   });
// };

// exports.createList = (Model, keys) => {
//   return catchAsync(async (req, res, next) => {
//     let aggregationPipeline = [];

//     // Project stage (select only the specified keys/fields)
//     if (keys && Array.isArray(keys) && keys.length > 0) {
//       const projection = keys.reduce((acc, key) => {
//         acc[key] = 1; // Include the specified fields in the result
//         return acc;
//       }, {});
//       aggregationPipeline.push({ $project: projection });
//     }

//     // Execute the aggregation pipeline
//     const docs = await Model.aggregate(aggregationPipeline);

//     // If no documents are found
//     if (!docs || docs.length === 0) {
//       return next(new AppError("No documents found", 404));
//     }

//     // Respond with the results
//     res.status(200).json({
//       status: "success",
// statusCode: 200,
//       result: docs.length,
//       data: docs,
//     });
//   });
// };


// // exports.deleteMultipleProduct= (model) =>{
// //   return catchAsync(async (req, res, next) => {
// //     console.log(req.body,"------------------------------------------");
// //     // const result = await model.deleteMany({ _id: { $in: idsToDelete } });
// //     console.log(`${result.deletedCount} documents deleted successfully.`);
// //     console.error('Error deleting documents:', error);
// // })
// // }
// exports.deleteMultipleProduct = (model) => {
//   return catchAsync(async (req, res, next) => {
//     try {
//       const ids = req.body.ids;

//       // Validate that the IDs array is provided
//       if (!ids || !Array.isArray(ids) || ids.length === 0) {
//         return res.status(400).json({
//           status: "fail",
//
// statusCode:200,           message: "No valid IDs provided.",
//         });
//       }

//       // Use deleteMany to delete documents with the given IDs
//       const result = await model.deleteMany({ _id: { $in: ids } });

//       if (result.deletedCount > 0) {
//         return res.status(200).json({
//           status: "success",
// statusCode: 200,
//           message: `${result.deletedCount} documents deleted successfully.`,
//         });
//       } else {
//         return res.status(404).json({
//           status: "fail",
//
// statusCode:200,           message: "No documents found with the given IDs.",
//         });
//       }
//     } catch (error) {
//       console.error("Error deleting documents:", error);
//       next(error); // Pass error to global error handler
//     }
//   });
// };
