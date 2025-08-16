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

const sendValidationError = (err) => {
  const errors = {};
  Object.values(err.errors).forEach(er => {
    errors[er.path] = er.message;
  });
  const message = 'Invalid input data';
  return new AppError(message, 400, { errors });
};

//
const sendTokenExpireError = (err) => {
  return new AppError("invalid token or token expired so log in again", 401);
};

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
      errors: err.details || null,
    });
  } else {
    console.error("ERROR IN PRODUCTION:", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong from backend",
    });
  }
};


module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    if (err.name === "CastError") err = handleCastErrorDB(err);
    if (err.code === 11000) err = sendDuplicateErorDB(err);
    if (err.name === "ValidationError") err = sendValidationError(err);
    if (err.name === "JsonWebTokenError") err = sendTokenError(err);
    if (err.name === "TokenExpiredError") err = sendTokenExpireError(err);
    sendErrorProd(err, res);
  }
};

