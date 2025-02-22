// class AppError extends Error {
//   constructor(message, statusCode) {
//     super(message); // seting up massga from parent class
//     this.statusCode = statusCode;
//     this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
//     this.isOperational = true;

//     Error.captureStackTrace(this, this.constructor); //show the stacktrace error message in the console where the error occurred
//   }
// }
// module.exports = AppError;
class AppError extends Error {
  constructor(message, statusCode, details = null, showStack = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    if (showStack) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}


module.exports = AppError;