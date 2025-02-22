const { promisify } = require('util');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../Models/UserModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const sendEmail = require('../Utils/email');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy'); // For 2FA (optional)

const cookieOptions = {
  expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: userData },
  });
};

// exports.signup = catchAsync(async (req, res, next) => {
//   const { name, email, password, passwordConfirm, passwordChangedAt, role } = req.body;
//   // Check if passwords match before proceeding
//   if (password !== passwordConfirm) {
//     return next(new AppError("Passwords do not match", 400));
//   }
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm,
//     passwordChangedAt,
//     role,
//   });
//   createSendToken(newUser, 201, res);
// });

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm,role } = req.body;
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword, // Store the hashed password
    passwordConfirm: hashedPassword, // Corrected: Store hashed password for passwordConfirm as well (or remove passwordConfirm from schema if not needed)
    role,
  });
  createSendToken(newUser, 201, res);
});

// exports.signup = catchAsync(async (req, res, next) => {
//   console.log(req.body);
//   const { name, email, password, passwordConfirm } = req.body;
//   if (password !== passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }
//   // const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm:hashedPassword,
//     role: 'user', 
//   });

//   createSendToken(newUser, 201, res);
// });

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Optional: Add 2FA check here if enabled
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1].replace(/['"]+/g, '');
  }
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password changed recently. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetToken = resetTokenHashed;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Reset it here: ${resetUrl}. Valid for 10 minutes.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Token',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send reset email. Try again later.', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }

  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  createSendToken(user, 200, res);
});

exports.updateUserPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  user.passwordChangedAt = Date.now();
  await user.save();
  createSendToken(user, 200, res);
});

// Optional: Add 2FA setup (requires User model to have twoFactorSecret field)
// exports.setup2FA = catchAsync(async (req, res, next) => {
//   const user = await User.findById(req.user.id);
//   const secret = speakeasy.generateSecret({ length: 20 });
//   user.twoFactorSecret = secret.base32;
//   await user.save();
//   res.status(200).json({
//     status: 'success',
//     data: { qrCode: secret.otpauth_url },
//   });
// });

// const { promisify } = require("util");
// const crypto = require("crypto");
// const User = require("../Models/UserModel");
// const catchAsync = require("../Utils/catchAsyncModule");
// const AppError = require("../Utils/appError"); // Make sure this is available for error handling
// const sendEmail = require("../Utils/email");
// const jwt = require("jsonwebtoken");

// // CORS Configuration
// // ---------------------------------------------------------------------------------------------------------------------------------------
// // const cookieOptions = {
// //   expires: new Date(
// //     Date.now() + process.env.JWT_Cookie_EXPIRES_IN * 24 * 60 * 60 * 1000
// //   ),
// //   secure: true,
// //   httpOnly: true,
// // };

// // const signToken = (id) => {
// //   return jwt.sign({ id: id }, process.env.JWT_SECRET, {
// //     expiresIn: process.env.JWT_EXPIRES_IN,
// //   });
// // };
// // // ---------------------------------------------------------------------------------------------------------------------------------------

// // const createSendToken = (user, statusCode, res) => {
// //   const token = signToken(user._id);
// //   if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
// //   res.cookie("jwt", token, cookieOptions);
// //   user.password = undefined;
// //   // Send the response
// //   res.status(statusCode).json({
// //     status: "success",
// //     token,
// //     data: {
// //       user: user,
// //     },
// //   });
// // };
// const cookieOptions = {
//   expires: new Date(Date.now() + process.env.JWT_Cookie_EXPIRES_IN * 24 * 60 * 60 * 1000),
//   httpOnly: true,  // Cookie can't be accessed via JavaScript (important for security)
// };

// // Sign JWT token
// const signToken = (id) => {
//   return jwt.sign({ id: id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,  // JWT expiration time
//   });
// };

// // Function to send JWT token in a cookie
// const createSendToken = (user, statusCode, res) => {
//   const token = signToken(user._id);
//   if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
//   res.cookie("jwt", token, cookieOptions);
//   user.password = undefined;
//   const userData = {
//     name: user.name,
//     email: user.email,
//     role: user.role
//   };
  
//   res.status(statusCode).json({
//     status: "success",
//     token,
//     data: {
//       user: userData,
//     },
//   });
// };

// // ---------------------------------------------------------------------------------------------------------------------------------------
// exports.signup = catchAsync(async (req, res, next) => {
//   const { name, email, password, passwordConfirm, passwordChangedAt, role } = req.body;
//   // Check if passwords match before proceeding
//   if (password !== passwordConfirm) {
//     return next(new AppError("Passwords do not match", 400));
//   }
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm,
//     passwordChangedAt,
//     role,
//   });
//   createSendToken(newUser, 201, res);
// });

// // ---------------------------------------------------------------------------------------------------------------------------------------
// // exports.login = catchAsync(async (req, res, next) => {
// //   const { email, password } = req.body;
// //   if (!email || !password) {
// //     return next(new AppError("Please provide an email and  a password", 400));
// //   }
// //   const user = await User.findOne({ email }).select("+password");
// //   if (!user || !(await user.correctPassword(password, user.password))) {
// //     return next(new AppError("Invalid emai and  password", 400));
// //   }

// //   createSendToken(user, 200, res);
// // });
// exports.login = catchAsync(async (req, res, next) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return next(new AppError("Please provide an email and a password", 400));
//   }
  
//   const user = await User.findOne({ email }).select("+password");
//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return next(new AppError("Invalid email or password", 400));
//   }
//   return createSendToken(user, 200, res);  
// });

// // ---------------------------------------------------------------------------------------------------------------------------------------
// exports.updateUserPassword = catchAsync(async (req, res, next) => {
//   const user = await User.findById(req.user.id).select("+password");
//   if (!user.correctPassword(req.body.currentPassword, user.password)) {
//     return next(AppError("password is innocorrect", 401));
//   }
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   await user.save();
//   createSendToken(user, 200, res);
// });


// exports.protect = catchAsync(async (req, res, next) => {
//   let token;
//   if (  req.headers.authorization && req.headers.authorization.startsWith("Bearer") )
//   {
//     token = req.headers.authorization.split(" ")[1];  // Extract token part after "Bearer"
//     token = token.replace(/['"]+/g, '');  // Remove any quotes around the token
//   }
//   if (!token) {
//     return next(
//       new AppError("You are not logged in! Please log in to get access.", 401)
//     );
//   }
//   try {
//     const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
//     const currentUser = await User.findById(decoded.id);
//     if (!currentUser) {
//       return next(
//         new AppError("The user belonging to this Id no longer exists.", 401)
//       );
//     }

//     if (currentUser.changePasswordAfter(decoded.iat)) {
//       return next(
//         new AppError("User recently changed the password. Log in again.", 401)
//       );
//     }
//     req.user = currentUser;
//     next();
//   } catch (err) {
//     return next(new AppError("Invalid or expired token.", 401));  // Handle JWT verification errors
//   }
// });

// //
// exports.restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return next(new AppError("User authentication required.", 401));
//     }

//     if (!roles.includes(req.user.role)) {
//       return next(
//         new AppError("You do not have permission to perform this action", 403)
//       );
//     }
//     next();
//   };
// };

// // ---------------------------------------------------------------------------------------------------------------------------------------

// ////////////////////////////////////////////////////
// exports.forgotPassword = catchAsync(async (req, res, next) => {
//   // Get user by email
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     return next(new AppError("No user found with that email", 404));
//   }

//   // Generate password reset token
//   const resetToken = user.createInstancePasswordToken();
//   await user.save({ validateBeforeSave: false }); // Save without validation to skip hashing

//   // Create reset URL
//   const resetUrl = `${req.protocol}://${req.get(
//     "host"
//   )}/api/v1/users/resetPassword/${resetToken}`;
//   const message = `Forgot your password? Submit a PATCH request with your new password and confirm it here: ${resetUrl}. If you did not request this, please ignore this email.`;

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: "Password reset link (valid for 10 minutes)",
//       message,
//     });

//     res.status(200).json({
//       status: "success",
//       message: "Token sent to email!",
//     });
//   } catch (err) {
//     // Handle error while sending email
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save({ validateBeforeSave: false });
//     return next(
//       new AppError(
//         "There was an error sending the email. Please try again later.",
//         500
//       )
//     );
//   }
// });
// // ---------------------------------------------------------------------------------------------------------------------------------------

// //////////////////////////////////////////////////////////////////////////////////////////////////
// exports.resetPassword = catchAsync(async (req, res, next) => {
//   // console.log(req.params.token, "available tokens");
//   const hashedToken = crypto
//     .createHash("sha256")
//     .update(req.params.token)
//     .digest("hex");
//   // console.log("Hashed token:", hashedToken);
//   // console.log("Received token:", req.params.token);

//   // Find the user with valid reset token and expiry
//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpires: { $gt: Date.now() },
//   });

//   if (!user) {
//     return next(
//       new AppError("Token is invalid or expired. Please try again", 400)
//     );
//   }

//   // Check if passwords match
//   if (req.body.password !== req.body.passwordConfirm) {
//     return next(new AppError("Passwords do not match", 400));
//   }

//   // console.log("Password reset expires:", user.passwordResetExpires);
//   // Update the user password
//   // user.currentPassword=req.body.currentPassword
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm; // Optional
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;

//   await user.save();

//   createSendToken(user, 200, res);
//   // const token = signToken(user._id); // Generate a new JWT
//   // res.status(200).json({
//   //   status: 'success',
//   //   token,
//   // });
// });

// // ---------------------------------------------------------------------------------------------------------------------------------------
// // better prctive is the send the token wiht header
// // exports.protect = catchAsync(async (req, res, next) => {
// //   console.log(req,"---------------------------------------------------------------")
// //   let token;
// //   console.log(req.headers.authorization); // This should print "Bearer <token>"

// //   if (
// //     req.headers.authorization &&
// //     req.headers.authorization.startsWith("Bearer")
// //   ) {
// //     token = req.headers.authorization.split(" ")[1];
// //     console.log("000000000000000000000000000000000000000000000000000000000000000000000000000000000",token);
// //   }
// //   if (!token) {
// //     return next(
// //       new AppError("You are not logged in! Please log in to get access.", 401)
// //     );
// //   }
// //   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
// //   // if user get change after the password change we need to chjeck if user exists and helps with login means password change token change
// //   const currentUser = await User.findById(decoded.id);
// //   if (!currentUser) {
// //     return next(
// //       new AppError("The user belonging to this Id no longer exists.", 401)
// //     );
// //   }

// //   if (currentUser.changePasswordAfter(decoded.iat)) {
// //     return next(
// //       new AppError("User recently changed the pssword Log IN Again", 401)
// //     );
// //   }
// //   req.user = currentUser;
// // });
// // exports.getAllUsers = catchAsync(async (req, res, next) => {
// //   const features = new ApiFeatures(User.find(), req.query)
// //     .filter()
// //     .limitFields()
// //     .sort()
// //     .paginate();
// //   const users = await features.query;
// //   createSendToken(users,200,res)
// //   // res.status(200).json({
// //   //   status: "success",
// //   //   result: users.length,
// //   //   data: { users },
// //   // });
// // });

// // exports.getAllUsersById =catchAsync(async (req, res, next) => {
// //   const user = await User.findById(req.params.id);
// //   if (!user) {
// //     return next(new AppError("User not found", 404));
// //   }
// //   createSendToken(user,200,res)
// //   // res.status(200).json({
// //   //   status: "success",
// //   //   data: { user },
// //   // });
// // });
