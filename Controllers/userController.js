const { promisify } = require("util");
const crypto = require("crypto");
const User = require("../Models/UserModel");
const catchAsync = require("../Utils/catchAsyncModule");
const AppError = require("../Utils/appError"); // Make sure this is available for error handling
const ApiFeatures = require("../Utils/ApiFeatures");
const sendEmail = require("../Utils/email");

const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm,passwordChangedAt,role } = req.body;
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
    passwordChangedAt,
    role
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

exports.getAllUsersById =catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: { user },
  });
});




///////////////

// note
// better prctive is the send the token wiht header
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization &&req.headers.authorization.startsWith("Bearer")){token = req.headers.authorization.split(" ")[1];}

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }
  
  // try {
  //   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // } catch (err) {
  //   return next(new AppError("Token has expired. Please log in again.", 401));
  // }
  
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // we use promisify here because it act as a promise and give resust as per promise like we done in every where
  // if user get change after the password change we need to chjeck if user exists and helps with login means password change token change
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this Id no longer exists.", 401)
    );
  }
  
 if( currentUser.changePasswordAfter(decoded.iat)){
  return next(new AppError("User recently changed the pssword Log IN Again",401))
 }
  req.user = currentUser;
  next();
});


exports.restrictTo=(...roles)=>{
  return (req, res, next) => {
    console.log(req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next(); 
  };
}
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("No user found with that email", 404));
  }

  // Generate password reset token
  const resetToken = user.createInstancePasswordToken();
  await user.save({ validateBeforeSave: false }); // Save without validation to skip hashing

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and confirm it here: ${resetUrl}. If you did not request this, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset link (valid for 10 minutes)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    // Handle error while sending email
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("There was an error sending the email. Please try again later.", 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
console.log(req.params.token,"available tokens");
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  console.log("Hashed token:", hashedToken);
  console.log("Received token:", req.params.token);

  // Find the user with valid reset token and expiry
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now()}
  });

  if (!user) {
    return next(new AppError('Token is invalid or expired. Please try again', 400));
  }

  // Check if passwords match
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  console.log("Password reset expires:", user.passwordResetExpires);
  // Update the user password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm; // Optional
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  const token = signToken(user._id); // Generate a new JWT

  
  res.status(200).json({
    status: 'success',
    token,
  });
});


// exports.forgotPassword = catchAsync(async (req,res,next)=>{
//   //get user on the given email
// const user = await  User.findOne({email:req.body.email})
// if(!user){
//   // send email to user that no user is found
//   return next(new AppError("User is not Found ,Write Correct Email", 404));
// }
//   //generate the random token using instant token method
//   const resetToken = user.createInstancePasswordToken()
//   await user.save({validateBeforeSave:false});
//   //send the token to user
// const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}}`
// const message = `User reset password ,submit new patch request with new password and password confirm to :${resetUrl}.\ If not forgotten the password please ignor this email `
// try{
// await sendEmail({
//   email:user.email,
//   subject: "Reset Password valid for (10 minutes)....",
//   message,
// })
//  //update the user password reset token and expires in
//   res.status(200).json({
//     status: "success",
//     message: "Token sent to email!",
//   });
// }catch(err){
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;
//   await user.save({ validateBeforeSave: false });
//   return next(new AppError('There was an error sending the email. Please try again later.', 500));
// }
// })
// exports.resetPassword = catchAsync(async (req, res, next) => {
//   // Get user based on the token
//   const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
// console.log("hashedToken",hashedToken,"passwordResetExpires",passwordResetExpires);
//   // Find the user with a valid password reset token and expiration date
//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpires: { $gt: Date.now() }
//   });

//   console.log("user",user);
//   // If no user found or the token has expired
//   if (!user) {
//     return next(new AppError('Token is invalid or expired, please try again', 400));
//   }

//   // Check if password and passwordConfirm match
//   if (req.body.password !== req.body.passwordConfirm) {
//     return next(new AppError('Passwords do not match', 400));
//   }

//   // Update user password and clear reset fields
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm; // Optional if you have separate confirm field
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;

//   // Save the updated user document
//   await user.save();

//   // Log the user in, send JWT
//   const token = signToken(user._id);

//   res.status(200).json({
//     status: 'success',
//     token: token,
//   });
// });
// exports.resetPassword =catchAsync(async(req,res,next)=>{
//   //get user based on token
// const hashedToken =  crypto.createHash('sha256').update(req.params.token).digest('hex')
//   //if token not expired change the pass else not
// const user = await user.findOne({passwordResetToken:hashedToken,passwordResetExpires:{gt:Date.now()}})
//   //update change passwordat proprty for user
// if(!user){
//   return next(new AppError('Token is invalid or expired, please try again', 400))
// }
// user.password = req.body.password
// user.passwordConfirm = req.body.passwordConfirm
// user.passwordResetToken=undefined
// user.passwordResetExpires=undefined
// await user.save();
//   //log the user in,send JWT
//   const token = signToken(user._id);
//   // console.log("Generated token:", token); // Log the token to verify it
//   // Check if passwords match before proceeding
//   res.status(200).json({
//     status: "successsss",
//     token: token,
//     // data: {
//     //   users,
//     // },
//   });
// })
