// app.all("*", (req, res, next) => {
//   next(
//     new AppError(
//       `Cant find the Requested url ${req.originalUrl} on Server `,
//       404
//     )
//   );
// });

module.exports = (err, req, res, next) => {
  console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
