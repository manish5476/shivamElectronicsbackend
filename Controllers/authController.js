// const { promisify } = require('util');
// const crypto = require('crypto');
// const bcrypt = require('bcryptjs');
// const User = require('../Models/UserModel');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const sendEmail = require('../Utils/email');
// const jwt = require('jsonwebtoken');
// const speakeasy = require('speakeasy'); // For 2FA (optional)

// const cookieOptions = {
//   expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
//   httpOnly: true,
//   secure: process.env.NODE_ENV === 'production',
// };

// const signToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
// };

// const createSendToken = (user, statusCode, res) => {
//   const token = signToken(user._id);
//   res.cookie('jwt', token, cookieOptions);
//   user.password = undefined;
//   const userData = {
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   };
//   res.status(statusCode).json({
//     status: 'success',
//     token,
//     data: { user: userData },
//   });
// };

// exports.signup = catchAsync(async (req, res, next) => {
//   console.log(req.body);
//   const { name, email, password, passwordConfirm, role } = req.body;

//   if (password !== passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }

//   // const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm,
//     role,
//   });

//   createSendToken(newUser, 201, res);
// });

// exports.login = catchAsync(async (req, res, next) => {
//   console.log(req.body);
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return next(new AppError('Please provide email and password', 400));
//   }

//   const user = await User.findOne({ email }).select('+password');
//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return next(new AppError('Invalid email or password', 401));
//   }

//   createSendToken(user, 200, res);
// });

// Controllers/authController.js
const { promisify } = require('util');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../Models/UserModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const sendEmail = require('../Utils/email');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const winston = require('winston'); // Import winston
const path = require('path');
const { MongoDB } = require
// Assuming you configure logger globally or import it from your app.js or a logger config file
// For simplicity, let's assume 'logger' is available globally or imported like this:
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log', level: 'info' }), 
  ]
});


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

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role,
  });

  logger.info(`User Signed Up: UserID: ${newUser._id}, Email: ${newUser.email}, Role: ${newUser.role}, IP: ${req.ip}`);
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    // --- LOGGING FAILED LOGIN ATTEMPT ---
    logger.warn(`Failed Login Attempt: Email: ${email}, IP: ${req.ip}`);
    return next(new AppError('Invalid email or password', 401));
  }
  logger.info(`User Logged In: UserID: ${user._id}, Email: ${user.email}, Role: ${user.role}, IP: ${req.ip}`);

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

// MODIFIED: restrictTo middleware to allow superAdmin to bypass role checks
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // If the user's role is 'superAdmin', bypass all other role checks
    if (req.user.role === 'superAdmin') {
      return next();
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

// const { promisify } = require('util');
// const crypto = require('crypto');
// const bcrypt = require('bcryptjs');
// const User = require('../Models/UserModel');
// const catchAsync = require('../Utils/catchAsyncModule');
// const AppError = require('../Utils/appError');
// const sendEmail = require('../Utils/email');
// const jwt = require('jsonwebtoken');
// const speakeasy = require('speakeasy'); // For 2FA (optional)

// const cookieOptions = {
//   expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
//   httpOnly: true,
//   secure: process.env.NODE_ENV === 'production',
// };

// const signToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
// };

// const createSendToken = (user, statusCode, res) => {
//   const token = signToken(user._id);
//   res.cookie('jwt', token, cookieOptions);
//   user.password = undefined;
//   const userData = {
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   };
//   res.status(statusCode).json({
//     status: 'success',
//     token,
//     data: { user: userData },
//   });
// };

// exports.signup = catchAsync(async (req, res, next) => {
//   console.log(req.body);
//   const { name, email, password, passwordConfirm, role } = req.body;

//   if (password !== passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }

//   // const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = await User.create({
//     name,
//     email,
//     password,
//     passwordConfirm,
//     role,
//   });

//   createSendToken(newUser, 201, res);
// });

// exports.login = catchAsync(async (req, res, next) => {
//   console.log(req.body);
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return next(new AppError('Please provide email and password', 400));
//   }

//   const user = await User.findOne({ email }).select('+password');
//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return next(new AppError('Invalid email or password', 401));
//   }

//   createSendToken(user, 200, res);
// });


// exports.protect = catchAsync(async (req, res, next) => {
//   let token;
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     token = req.headers.authorization.split(' ')[1].replace(/['"]+/g, '');
//   }
//   if (!token) {
//     return next(new AppError('You are not logged in! Please log in to get access.', 401));
//   }

//   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
//   const currentUser = await User.findById(decoded.id);
//   if (!currentUser) {
//     return next(new AppError('The user belonging to this token no longer exists.', 401));
//   }

//   if (currentUser.changedPasswordAfter(decoded.iat)) {
//     return next(new AppError('Password changed recently. Please log in again.', 401));
//   }

//   req.user = currentUser;
//   next();
// });

// exports.restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return next(new AppError('Authentication required', 401));
//     }
//     if (!roles.includes(req.user.role)) {
//       return next(new AppError('You do not have permission to perform this action', 403));
//     }
//     next();
//   };
// };

// exports.forgotPassword = catchAsync(async (req, res, next) => {
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     return next(new AppError('No user found with that email', 404));
//   }

//   const resetToken = crypto.randomBytes(32).toString('hex');
//   const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');
//   user.passwordResetToken = resetTokenHashed;
//   user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
//   await user.save({ validateBeforeSave: false });

//   const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
//   const message = `Forgot your password? Reset it here: ${resetUrl}. Valid for 10 minutes.`;

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: 'Password Reset Token',
//       message,
//     });
//     res.status(200).json({
//       status: 'success',
//       message: 'Token sent to email!',
//     });
//   } catch (err) {
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save({ validateBeforeSave: false });
//     return next(new AppError('Failed to send reset email. Try again later.', 500));
//   }
// });

// exports.resetPassword = catchAsync(async (req, res, next) => {
//   const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpires: { $gt: Date.now() },
//   });

//   if (!user) {
//     return next(new AppError('Token is invalid or expired', 400));
//   }

//   if (req.body.password !== req.body.passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }

//   user.password = await bcrypt.hash(req.body.password, 10);
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;
//   user.passwordChangedAt = Date.now();
//   await user.save();

//   createSendToken(user, 200, res);
// });

// exports.updateUserPassword = catchAsync(async (req, res, next) => {
//   const user = await User.findById(req.user.id).select('+password');
//   if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
//     return next(new AppError('Current password is incorrect', 401));
//   }

//   user.password = await bcrypt.hash(req.body.password, 10);
//   user.passwordChangedAt = Date.now();
//   await user.save();
//   createSendToken(user, 200, res);
// });
