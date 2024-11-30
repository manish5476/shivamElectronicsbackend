const User = require("../Models/UserModel");
const { query } = require("express");
const ApiFeatures = require("../Utils/ApiFeatures");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError");
const jwt = require("jsonwebtoken");

const signToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  };
  // 
   
  const createSendToken=(user,statusCode,res)=>{
    const token = signToken(user._id);
    // Send the response
    res.status(statusCode).json({
      status: "success",
      token,
      data: {
        user: user,
      },
    });
  }

exports.getAllUsers = catchAsync(async (req, res, next) => {
    const features = new ApiFeatures(User.find(), req.query)
      .filter()
      .limitFields()
      .sort()
      .paginate();
    const users = await features.query;
    createSendToken(users,200,res)
    // res.status(200).json({
    //   status: "success",
    //   result: users.length,
    //   data: { users },
    // });
  });
  
  exports.getAllUsersById =catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    createSendToken(user,200,res)
    // res.status(200).json({
    //   status: "success",
    //   data: { user },
    // });
  });