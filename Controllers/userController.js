const { promisify } = require("util");
const User = require("../Models/UserModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError"); // Make sure this is available for error handling
const ApiFeatures = require("../Utils/ApiFeatures");
const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  // Check if passwords match before proceeding
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }
  // Create the new user
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });
  const token = signToken(newUser._id);

  // Send the response
  res.status(201).json({
    status: "success",
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // console.log(email, password);

  if (!email || !password) {
    return next(new AppError("Please provide an email and  a password", 400));
  }
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Invalid emai and  password", 400));
  }
  const token = signToken(user._id);
  // console.log("Generated token:", token); // Log the token to verify it
  // Check if passwords match before proceeding
  res.status(200).json({
    status: "successsss",
    token: token,
    // data: {
    //   users,
    // },
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(User.find(), req.query)
    .filter()
    .limitFields()
    .sort()
    .paginate();
  const users = await features.query;
  res.status(200).json({
    status: "success",
    result: users.length,
    data: { users },
  });
});

// note
// better prctive is the send the token wiht header

exports.protect = catchAsync(async (req, res, next) => {
  // console.log(req.headers);
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // we use promisify here because it act as a promise and give resust as per promise like we done in every where
  console.log("decoded", decoded); //example { id: '673b7badcd643e50cc9517c9', iat: 1732112514, exp: 1739888514 }

  // if user get change after the password change we need to chjeck if user exists and helps with login means password change token change
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this Id no longer exists.", 401)
    );
  }
  currentUser.changePasswordAfter(decoded.iat);
  // req.user = currentUser;
  next();
});

// exports.protect = catchAsync(async (req, res, next) => {
//   // const token=
//   let token;
//   //get the token
//   if(req.headers.authorization  && req.headers.authorization.startsWith('Bearer')){
//      token= req.headers.authorization.split(' ')[1]
//   }

//   if(!token){
//   return next(new AppError("token expired please log in Again",401))
//   }
//   console.log("token",token,)

//   // verifiation the token

//   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
//   console.log("decoded",decoded);

//   //check if user exist

//   // check f the user channge the password after the jwt is asigned

//   //next is called

//   next();
// });

// // // const User= require('../Models/User')
// // // const catchAsync=require('../Utils/catchAsyncModule')
// // // // const AppError=require('../Utils/appError')

// // // exports.signup =catchAsync( async(req,res,next)=>{
// // //     const newUser= await User.create(req.body)
// // //     // if(!newUser){
// // //     //     return next(new AppError("Product not created", 404));
// // //     // }
// // //     res.status(201).json({
// // //         status:'success',
// // //         data:{
// // //             user:newUser
// // //         }
// // //     })
// // //     next()
// // // })

// // exports.login = catchAsync(async (req, res, next) => {
// //   const { email, password } = req.body;

// //   // 1. Check if email and password are provided
// //   if (!email || !password) {
// //     return next(new AppError("Please provide email and password", 400));
// //   }

// //   // 2. Find user by email
// //   const user = await User.findOne({ email }).select('+password');
// //   if (!user) {
// //     return next(new AppError("Invalid credentials", 401));
// //   }

// //   // 3. Check if password is correct
// //   const isPasswordCorrect = await user.correctPassword(password, user.password);
// //   if (!isPasswordCorrect) {
// //     return next(new AppError("Invalid credentials", 401));
// //   }

// //   // 4. Generate token and send response
// //   const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
// //     expiresIn: process.env.JWT_EXPIRES_IN,
// //   });

// //   res.status(200).json({
// //     status: "success",
// //     token,
// //   });
// // });

// const User = require("../Models/UserModel");
// const jwt = require("jsonwebtoken");
// const catchAsync = require("../Utils/catchAsyncModule");
// const AppError = require("../Utils/appError");
// const ApiFeatures = require("../Utils/ApiFeatures");

// const createToken = (id) =>
//   jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });

// exports.signup = catchAsync(async (req, res, next) => {
//   const { name, email, password, passwordConfirm } = req.body;

//   if (!name || !email || !password || !passwordConfirm) {
//     return next(new AppError("All fields are required", 400));
//   }

//   if (password !== passwordConfirm) {
//     return next(new AppError("Passwords do not match", 400));
//   }

//   const newUser = await User.create({ name, email, password, passwordConfirm });

//   const token = createToken(newUser._id);

//   res.status(201).json({
//     status: "success",
//     token,
//     data: { user: newUser },
//   });
// });

// exports.login = catchAsync(async (req, res, next) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return next(new AppError("Please provide email and password", 400));
//   }

//   const user = await User.findOne({ email }).select("+password");

//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return next(new AppError("Invalid credentials", 401));
//   }

//   const token = createToken(user._id);

//   res.status(200).json({
//     status: "success",
//     token,
//   });
// });

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const features = new ApiFeatures(User.find(), req.query)
//     .filter()
//     .limitFields()
//     .sort()
//     .paginate();

//   const users = await features.query;

//   res.status(200).json({
//     status: "success",
//     result: users.length,
//     data: { users },
//   });
// });
