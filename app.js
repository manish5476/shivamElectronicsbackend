const express = require("express");
const app = express();
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanatize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const globalErrorhandler = require("./Controllers/errorController");
const AppError = require("./Utils/appError");
const productRoutes = require("./routes/productRoutes");
const usersRoutes = require("./routes/UserRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cors = require("cors");
const hpp = require("hpp");
app.use(helmet());

//development mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//production mode rate limiter and rate
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: "Too many requests from this IP, please try again in an hour", // default message
});

//global error hand  ler middleware
app.use("/api", limiter); //limiter

//body parser readign data from body req.body

app.use(express.json({ limit: "10kb" }));
app.use(cors());

app.use(morgan("combined"));

// app.use(express.json());
app.use(mongoSanatize());

//data sanitizer
app.use(xss());

app.use(
  hpp({
    whitelist: ["duration", "limit", "average"],
  })
);
//serving statc sites
app.use(express.static(`${__dirname}/public/`));

app.use((req, res, next) => {
  req.getTime = new Date().toISOString();
  next();
});

//testing middleware
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/reviews", reviewRoutes);

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
