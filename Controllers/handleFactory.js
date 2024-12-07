const { query } = require("express");
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
      Status: "success",
      message: "Data deleted successfully",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body);
    if (!doc) {
      return next(new AppError(`doc not found with Id ${req.params.id}`, 404));
    }
    res.status(201).json({
      status: "Success",
      data: doc,
    });
  });

exports.newOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    if (!doc) {
      return next(new AppError("Failed to create product", 400));
    }
    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, autoPopulateOptions) => {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (autoPopulateOptions) {
      query.populate(autoPopulateOptions);
    }
    const doc = await query;
    // const doc = await Model.findById(req.params.id).populate(autoPopulateOptions);;
    if (!doc) {
      return next(new AppError("doc not found with Id", 404));
    }
    res.status(200).json({
      status: "success",
      length: doc.length,
      data: doc,
    });
  });
};

exports.getAll = (Model, autoPopulateOptions) => {
  return catchAsync(async (req, res, next) => {
    // small hack for nested routing
    let filter = {};
    if (req.params.productId) filter = { product: req.params.productID };

    if (autoPopulateOptions) {
      feature = new ApiFeatures(
        Model.find(filter).populate(autoPopulateOptions),
        req.query
      );
    } else {
      feature = new ApiFeatures(Model.find(), req.query);
    }
    const data = feature.filter().limitFields().sort().paginate();
    const doc = await data.query;
    // const doc = await data.query.explain();
    res.status(200).json({
      status: "success",
      result: doc.length,
      data: { doc },
    });
  });
};

// //
// exports.deleteOne = (Model) =>
//   catchAsync(async (req, res, next) => {
//     const doc = await Model.findByIdAndDelete(req.params.id);
//     if (!doc) {
//       return next(new AppError(`${Model.modelName} not found with ID ${req.params.id}`, 404));
//     }
//     res.status(200).json({
//       status: "success",
//       message: "Data deleted successfully",
//       data: null,
//     });
//   });
//   exports.updateOne = (Model) =>
//     catchAsync(async (req, res, next) => {
//       const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
//         new: true, // Return the updated document
//         runValidators: true, // Ensure validation is applied
//       });
//       if (!doc) {
//         return next(new AppError(`${Model.modelName} not found with ID ${req.params.id}`, 404));
//       }
//       res.status(200).json({
//         status: "success",
//         data: {
//           data: doc,
//         },
//       });
//     });
//     exports.newOne = (Model) =>
//       catchAsync(async (req, res, next) => {
//         const doc = await Model.create(req.body);
//         res.status(201).json({
//           status: "success",
//           data: {
//             data: doc,
//           },
//         });
//       });
//       exports.getOne = (Model, autoPopulateOptions) =>
//         catchAsync(async (req, res, next) => {
//           let query = Model.findById(req.params.id);
//           if (autoPopulateOptions) {
//             query = query.populate(autoPopulateOptions);
//           }
//           const doc = await query;
//           if (!doc) {
//             return next(new AppError(`${Model.modelName} not found with ID ${req.params.id}`, 404));
//           }
//           res.status(200).json({
//             status: "success",
//             data: {
//               data: doc,
//             },
//           });
//         });
