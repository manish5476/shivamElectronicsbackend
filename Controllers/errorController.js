const AppError = require("../Utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

//
const sendDuplicateErorDB = (err) => {
  const value = Object.values(err.keyValue).join(", ");
  const message = `Duplicate field value: "${value}". Please use another value.`;
  return new AppError(message, 400);
};
// const sendDuplicateErorDB = (err) => {
//   // const value = Object.values(err.keyValue).join(", ");
//   // const message = `Duplicate field value: ${value}. Please use another value.`;
//   // return new AppError(message, 400);
//   const value = err.errmsg.match(/(["])(\\?.)*?\1/)[0];
//   console.log(value, err);
//   const message = `Duplicate filed value :${value} use another value`;
//   return new AppError(message, 400);
// };
//
const sendTokenError = (err) => {
  return new AppError("invalid token log in Again", 401);
};

const sendValidationError = (err, res) => {
  const error = Object.values(err.errors).map((er) => er.message);
  const message = `invalid input value ${error.join(". ")}`;
  return new AppError(message, 400);
};
//
const sendTokenExpireError = (err) => {
  return new AppError("invalid token or token expired so log in again", 401);
};

// //
//
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR IN PRODUCTION:", err);
    res.status(500).json({
      status: "error",
      message: "Some error occurred!",
    });
  }
};

module.exports = (err, req, res, next) => {
  console.error(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = {
      ...err,
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = sendDuplicateErorDB(error);
    if (err.name === "validationError") error = sendValidationError(error);
    if (error.name === "JsonWebTokenError") error = sendTokenError(error);
    if (error.name === "TokenExpiredError") error = sendTokenExpireError(error);
  }
  
  sendErrorProd(err, res);
  next(); // Ensure the middleware chain continues if needed
};

// const AppError = require("../Utils/appError");

// const handleCastErrorDB = (err) => {
//   const message = `invalid ${err.path}: ${err.value}`;
//   return new AppError(message, 400);
// };

// const sendErrorDev = (err, res) => {
//   res.status(err.statusCode).json({
//     status: err.status,
//     errors: err,
//     message: err.message,
//     stack: err.stack,
//   });
// };

// const sendErrorProd = (err, res) => {
//   if (err.isOperational) {
//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//     //programming or other error:dont disclose the error
//   } else {
//     console.error("ERROR IN PRODUCTION 🫠🫠🫠🫠", err);
//     // console.error

//     res.status(500).json({
//       status: "error",
//       message: "some error occurred",
//     });
//   }
// };

// module.exports = (err, req, res, next) => {
//   console.log(err.stack);
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";
//   //
//   if (process.env.NODE_ENV === "development") {
//     sendErrorDev(err, res);
//   } else if (process.env.NODE_ENV === "production") {
//     let error = { ...err };
//     if (error.name === "CastError") error = handleCastErrorDB(error);
//     sendErrorProd(error, res);
//   }
// };

// // res.status(err.statusCode).json({
// //   status: err.status,
// //   message: err.message,
// // });

// // app.all("*", (req, res, next) => {
// //   next(
// //     new AppError(
// //       `Cant find the Requested url ${req.originalUrl} on Server `,
// //       404
// //     )
// //   );
// // });

// chatgptone
// const AppError = require("../Utils/appError");

// const handleCastErrorDB = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}`;
//   return new AppError(message, 400);
// };

// const sendDuplicateErorDB = (err) => {
//   const value = Object.values(err.keyValue).join(", ");
//   const message = `Duplicate field value: "${value}". Please use another value.`;
//   return new AppError(message, 400);
// };

// const sendValidationError = (err) => {
//   const errors = Object.values(err.errors).map((er) => er.message);
//   const message = `Invalid input data: ${errors.join(". ")}`;
//   return new AppError(message, 400);
// };

// const sendErrorDev = (err, res) => {
//   console.log("Request Headers:", req.headers);
//   console.log("Request Body:", req.body);
//   res.status(err.statusCode).json({
//     status: err.status,
//     error: err,
//     message: err.message,
//     stack: err.stack,
//   });
// };

// const sendErrorProd = (err, res) => {
//   if (err.isOperational) {
//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//   } else {
//     console.error("ERROR IN PRODUCTION:", err);
//     res.status(500).json({
//       status: "error",
//       message: "Something went wrong! Please try again later.",
//     });
//   }
// };

// module.exports = (err, req, res, next) => {
//   console.error(err.stack);

//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";

//   if (process.env.NODE_ENV === "development") {
//     sendErrorDev(err, res);
//   } else if (process.env.NODE_ENV === "production") {
//     let error = Object.assign({}, err);
//     if (error.name === "CastError") error = handleCastErrorDB(error);
//     if (error.code === 11000) error = sendDuplicateErorDB(error);
//     if (error.name === "ValidationError") error = sendValidationError(error);

//     sendErrorProd(error, res);
//   }

//   next();
// };
