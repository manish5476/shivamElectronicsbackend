class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // seting up massga from parent class
    this.statusCode = statusCode;
    // this.message=message;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); //show the stacktrace error message in the console where the error occurred
  }
}
module.exports = AppError;
