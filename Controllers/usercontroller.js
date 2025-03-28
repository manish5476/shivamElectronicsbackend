const User = require("../Models/UserModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const handleFactory = require("./handleFactory");

const filterObj = (obj, ...allowedFields) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => allowedFields.includes(key))
  );
};

const createSendToken = (user, statusCode, res) => {
  res.status(statusCode).json({
    status: "success",
    data: { user: user || null },
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("Use dedicated password update route", 400));
  }

  const filteredBody = filterObj(req.body, "name", "email");
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  createSendToken(updatedUser, 200, res);
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: "success", data: null });
});

// Factory handlers
exports.getAllUsers = handleFactory.getAll(User);
exports.getUserById = handleFactory.getOne(User);
exports.deleteUser = handleFactory.deleteOne(User);
exports.updateUser = handleFactory.updateOne(User);
// const User = require("../Models/UserModel");
// const { query } = require("express");
// const ApiFeatures = require("../Utils/ApiFeatures");
// const catchAsync = require("../Utils/catchAsyncModule");
// const AppError = require("../Utils/appError");
// const jwt = require("jsonwebtoken");
// const handleFactory = require("./handleFactory");
// // ---------------------------------------------------------------------------------------------------------------------------------------
// const filterObj = (obj, ...allowedFields) => {
//   const newObj = {};
//   Object.keys(obj).forEach((el) => {
//     if (allowedFields.includes(el)) {
//       newObj[el] = obj[el];
//     }
//   });
//   return newObj;
// };

// const createSendToken = (user, statusCode, res) => {
//   // const token = signToken(user._id);
//   // Send the response
//   res.status(statusCode).json({
//     status: "success",
//     data: {
//       user: user,
//     },
//   });
// };
// exports.getMe = (req, res, next) => {
//   req.params.id = req.user.id;
//   next();
// };
// //
// exports.updateMe = catchAsync(async (req, res, next) => {
//   const filteredBody = filterObj(req.body, "name", "email");
//   //create a error if user try to u pdate the password
//   if (req.body.password || req.body.passwordConfirm) {
//     return next(
//       new AppError("this is not the route for the password updation. ", 400)
//     );
//   }
//   //we are writing x because we dont want all the data from the body should be updated only nmae and email
//   const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
//     new: true,
//     runValidators: true,
//   });
//   createSendToken(updatedUser, 200, res);
// });

// // ---------------------------------------------------------------------------------------------------------------------------------------
// exports.deleteMe = catchAsync(async (req, res, next) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });
//   // createSendToken("null",200,res)
//   res.status(204).json({
//     status: "success",
//     data: "null",
//   });
// });

// exports.getAllUsers = handleFactory.getAll(User);
// exports.getAllUsersById = handleFactory.getOne(User);
// exports.deleteUser = handleFactory.deleteOne(User);
// exports.updateUser = handleFactory.updateOne(User);

// // ---------------------------------------------------------------------------------------------------------------------------------------

// // exports.getAllUsers = catchAsync(async (req, res, next) => {
// //   const features = new ApiFeatures(User.find(), req.query)
// //     .filter()
// //     .limitFields()
// //     .sort()
// //     .paginate();
// //   const users = await features.query;
// //   createSendToken(users, 200, res);
// // });
// // ---------------------------------------------------------------------------------------------------------------------------------------

// // exports.getAllUsersById = catchAsync(async (req, res, next) => {
// //   const user = await User.findById(req.params.id);
// //   if (!user) {
// //     return next(new AppError("User not found", 404));
// //   }
// //   createSendToken(user, 200, res);
// // });
// // // ---------------------------------------------------------------------------------------------------------------------------------------
