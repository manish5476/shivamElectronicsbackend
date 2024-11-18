// const User= require('../Models/User')
// const catchAsync=require('../Utils/catchAsyncModule')
// // const AppError=require('../Utils/appError')

// exports.signup =catchAsync( async(req,res,next)=>{
//     const newUser= await User.create(req.body)
//     // if(!newUser){
//     //     return next(new AppError("Product not created", 404));
//     // }
//     res.status(201).json({
//         status:'success',
//         data:{
//             user:newUser
//         }
//     })
//     next()
// })
const User = require('../Models/User');
const catchAsync = require('../Utils/catchAsyncModule');
const AppError = require('../Utils/appError'); // Make sure this is available for error handling

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  // Check if passwords match before proceeding
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  // Create the new user
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });

  // Send the response
  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});
