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

exports.forgotPassword = catchAsync(async (req,res,next)=>{
  //get user on the given email
const user = await  User.findOne({email:req.body.email})
if(!user){
  // send email to user that no user is found
  return next(new AppError("User is not Found ,Write Correct Email", 404));
}
  //generate the random token using instant token method
  const resetToken = user.createInstancePasswordToken()
  await user.save({validateBeforeSave:false});
  //send the token to user
const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}}`
const message = `User reset password ,submit new patch request with new password and password confirm to :${resetUrl}.\ If not forgotten the password please ignor this email `
try{
await sendEmail({
  email:user.email,
  subject: "Reset Password valid for (10 minutes)...",
  message,

})
  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
}catch(err){
user.passwordResetToken=undefined,
user.passwordResetExpires=undefined,
await user.save({validateBeforeSave:false});
return next(new AppError('there was an error sending an email,...try later'),500)
}
})

exports.resetPassword =catchAsync(async(req,res,next)=>{
  //get user based on token
const hasToken =  crypto.createHash('sha256').update(req.params.token).digest('hex')
  //if token not expired change the pass else not

  //update change passwordat proprty for user

  //log the user in,send JWT
})
