const { promisify } = require('util');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../Models/UserModel'); // Ensure this path is correct
const catchAsync = require('../Utils/catchAsyncModule'); // Ensure this path is correct
const AppError = require('../Utils/appError'); // Ensure this path is correct
const sendEmail = require('../Utils/email'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy'); // If you're using 2FA
const winston = require('winston'); // Import winston
const path = require('path');
const ApiFeatures = require('../Utils/ApiFeatures'); // Import ApiFeatures

// Assuming you configure logger globally or import it from your app.js or a logger config file
// For simplicity, let's assume 'logger' is available globally or imported like this:
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/auth.log'), level: 'info' }), // Corrected path for logs
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
  user.password = undefined; // Remove password from output
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

// --- API Controller Functions (for Express routes) ---

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm, // Mongoose will handle this if defined in schema, or ignore if not
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
    // --- IMPORTANT CHANGE HERE ---
    // Your UserModel's correctPassword method only takes one argument (candidatePassword)
    if (!user || !(await user.correctPassword(password))) { // Removed 'user.password' from arguments
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

  // Use the bot-friendly verification logic
  const currentUser = await exports.verifyTokenAndGetUserBot(`Bearer ${token}`);
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

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

  // IMPORTANT: req.protocol and req.get('host') are Express-specific.
  // Ensure your environment variables or a config provide the base URL for emails.
  const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`; // Fallback for API context
  const resetUrl = `${baseUrl}/api/v1/users/resetPassword/${resetToken}`;
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




// --- Bot-Specific Helper Functions (No req, res, next) ---
// These functions will be called directly by the Telegram bot handlers.

exports.signupBot = async (name, email, password, passwordConfirm, role) => {
  if (password !== passwordConfirm) {
    throw new AppError('Passwords do not match', 400);
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role || 'user',
  });

  logger.info(`Bot User Signed Up: UserID: ${newUser._id}, Email: ${newUser.email}, Role: ${newUser.role}`);
  const token = signToken(newUser._id);
  newUser.password = undefined; // Remove password from output
  return { user: newUser, token };
};


exports.loginBot = async (email, password) => {
    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    // --- IMPORTANT CHANGE HERE ---
    // Your UserModel's correctPassword method only takes one argument (candidatePassword)
    if (!user || !(await user.correctPassword(password))) { // Removed 'user.password' from arguments
        logger.warn(`Bot Failed Login Attempt: Email: ${email}`);
        throw new AppError('Invalid email or password', 401);
    }
    logger.info(`Bot User Logged In: UserID: ${user._id}, Email: ${user.email}, Role: ${user.role}`);

    const token = signToken(user._id);
    user.password = undefined; // Remove password from output
    return { user, token };
};

exports.verifyTokenAndGetUserBot = async (tokenHeader) => {
  if (!tokenHeader || !tokenHeader.startsWith('Bearer')) {
    throw new AppError('Authorization header missing or malformed.', 401);
  }
  const token = tokenHeader.split(' ')[1].replace(/['"]+/g, ''); // Clean quotes if present

  if (!token) {
    throw new AppError('Token missing.', 401);
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please log in again!', 401);
    }
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired! Please log in again.', 401);
    }
    throw new AppError('Token verification failed.', 401);
  }

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError('User recently changed password! Please log in again.', 401);
  }
  return currentUser; // Return the user object, which contains the role
};


/*
const User = require('../Models/UserModel');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError');
const sendEmail = require('../Utils/email');
const authService = require('../Services/authService'); // Import the new service
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
};

// Helper to send the token in a cookie and as a JSON response
const createSendToken = (user, token, statusCode, res) => {
    res.cookie('jwt', token, cookieOptions);
    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const { user, token } = await authService.signupUser(req.body);
    createSendToken(user, token, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    createSendToken(user, token, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    req.user = await authService.verifyTokenAndGetUser(req.headers.authorization);
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // Super Admins are allowed to do everything
        if (req.user && req.user.role === 'superAdmin') {
            return next();
        }
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

// --- Password Management ---

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('No user found with that email', 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;
    const message = `Forgot your password? Reset it here: ${resetUrl}. This link is valid for 10 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your Password Reset Token',
            message,
        });
        res.status(200).json({ status: 'success', message: 'Token sent to email!' });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError('Failed to send reset email. Please try again later.', 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm; // Let the model validator handle the match
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const { token } = await authService.loginUser(user.email, req.body.password);
    createSendToken(user, token, 200, res);
});

exports.updateUserPassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.correctPassword(req.body.currentPassword))) {
        return next(new AppError('Your current password is incorrect', 401));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    const { token } = await authService.loginUser(user.email, req.body.password);
    createSendToken(user, token, 200, res);
});*/