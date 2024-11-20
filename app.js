const express = require("express");
const app = express();
const AppError = require("./Utils/appError");
const globalErrorhandler = require("./Controllers/errorController");

app.use(express.json());
const morgan = require("morgan");

const productRoutes = require("./routes/product");
const usersRoutes = require("./routes/UserRoutes");

// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }
const cors = require("cors");
// const AppError = require("./Utils/appError");
app.use(cors());

app.use(morgan("combined"));
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  req.getTime = new Date().toISOString();
  next();
});
app.use(express.static(`${__dirname}/public/`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers)
  next();
});

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/Product", productRoutes);

app.all("*", (req, res, next) => {
  next(
    new AppError(
      `Cant find the Requested url ${req.originalUrl} on Server `,
      404
    )
  );
});

app.use(globalErrorhandler); //errorcontroller.js

module.exports = app;
