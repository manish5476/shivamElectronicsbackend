
require('dotenv').config({ path: './.env' });
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const compression = require('compression');
const winston = require('winston');
const globalErrorHandler = require('./Controllers/errorController');
const AppError = require('./Utils/appError');
const productRoutes = require('./routes/productRoutes');
const usersRoutes = require('./routes/UserRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const invoiceRoutes = require('./routes/InvoiceRoutes');

const app = express();

// Logger Setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Security Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:4200',
  methods: 'GET,POST,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiter
const limiter = rateLimit({
  max: 200,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api/v1', limiter);

// Body Parser & Compression
app.use(express.json({ limit: '10kb' }));
app.use(compression());

// Data Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));

// Static Files
app.use('/public', express.static(`${__dirname}/public`, { maxAge: '1d', dotfiles: 'deny' }));

// Request Timing
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// JSON Error Handling
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return next(new AppError('Invalid JSON payload', 400));
  }
  next(err);
});

// Routes
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/sellers', sellerRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

// Catch-All Route
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;

// const express = require("express");
// const morgan = require("morgan");
// const rateLimit = require("express-rate-limit");
// const helmet = require("helmet");
// const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");
// const hpp = require("hpp");
// const cors = require("cors");
// const globalErrorHandler = require("./Controllers/errorController");
// const AppError = require("./Utils/appError");
// const productRoutes = require("./routes/productRoutes");
// const usersRoutes = require("./routes/UserRoutes");
// const reviewRoutes = require("./routes/reviewRoutes");
// const customerRoutes = require("./routes/customerRoutes");
// const paymentRoutes = require("./routes/paymentRoutes")
// const sellerRoutes = require("./routes/sellerRoutes");
// const invoiceRoutes = require("./routes/InvoiceRoutes");

// const app = express();

// // === Security Middleware ===
// app.use(helmet()); // Adds security headers

// // === CORS Configuration ===
// const corsOptions = {
//   // origin: "https://4200-idx-frontend-1737021882096.cluster-fu5knmr55rd44vy7k7pxk74ams.cloudworkstations.dev", http://localhost:4200/// Update with your Angular app's URL
//   origin: "http://localhost:4200",
//   // origin: "https://4200-idx-frontend-1737021882096.cluster-fu5knmr55rd44vy7k7pxk74ams.cloudworkstations.dev",
//   methods: "GET,POST,PATCH,DELETE,OPTIONS",
//   allowedHeaders: "Content-Type,Authorization",
//   credentials: true, // Allow cookies if needed
// };
// app.use(cors(corsOptions));

// // Handle preflight requests
// app.options("*", cors(corsOptions));

// // === Logging Middleware ===
// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// } else {
//   app.use(morgan("combined")); // More detailed logging for production
// }

// // === Rate Limiter ===
// const limiter = rateLimit({
//   max: 200, // Limit to 100 requests per hour
//   windowMs: 60 * 60 * 1000, // 1-hour window
//   message: "Too many requests from this IP, please try again in an hour",
// });
// app.use("/api", limiter);

// // === Body Parser ===
// app.use(express.json({ limit: "10kb" })); // Limit the size of JSON bodies

// // === Data Sanitization ===
// app.use(mongoSanitize()); // Prevent NoSQL injection
// app.use(xss()); // Prevent XSS attacks

// // === HPP (Parameter Pollution Protection) ===
// app.use(
//   hpp({
//     whitelist: ["duration", "limit", "average"], // Allow safe query parameters
//   })
// );

// // === Static Files ===
// app.use(express.static(`${__dirname}/public/`));

// // === Middleware for Debugging Headers ===
// app.use((req, res, next) => {
//   // console.log("Incoming Headers:", req.headers); // Debug incoming headers
//   next();
// });

// // === Middleware for Request Timing ===
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   next();
// });

// // === Routes ===
// app.use("/api/v1/users", usersRoutes);
// app.use("/api/v1/products", productRoutes);
// app.use("/api/v1/reviews", reviewRoutes);
// app.use("/api/v1/customers", customerRoutes);
// app.use("/api/v1/payments", paymentRoutes)
// app.use("/api/v1/sellers", sellerRoutes)
// app.use("/api/v1/invoices", invoiceRoutes)

// // === Catch-All Route for Undefined Routes ===
// app.all("*", (req, res, next) => {
//   next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
// });

// // === Global Error Handler ===
// app.use(globalErrorHandler);
// module.exports = app;

// const express = require("express");
// const app = express();
// const morgan = require("morgan");
// const rateLimit = require("express-rate-limit");
// const helmet = require("helmet");
// const mongoSanatize = require("express-mongo-sanitize");
// const xss = require("xss-clean");
// const globalErrorhandler = require("./Controllers/errorController");
// const AppError = require("./Utils/appError");
// const productRoutes = require("./routes/productRoutes");
// const usersRoutes = require("./routes/UserRoutes");
// const reviewRoutes = require("./routes/reviewRoutes");
// const customerRoutes = require("./routes/customerRoutes");
// const cors = require("cors");
// const hpp = require("hpp");

// //
// app.use(helmet());

// // const corsOptions = {
// //   origin: 'https://4000-idx-shivamelectronicsbackendgit-1736444920605.cluster-a3grjzek65cxex762e4mwrzl46.cloudworkstations.dev/', // Allow the Angular app's origin
// //   credentials: true, // Allow credentials (cookies) to be sent with the request
// // };
// // app.use(cors(corsOptions));
// //development mode

// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }

// //production mode rate limiter and rate
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000, // 1 hour window
//   message: "Too many requests from this IP, please try again in an hour", // default message
// });

// //global error hand  ler middleware
// app.use("/api", limiter); //limiter

// //body parser readign data from body req.body

// app.use(express.json({ limit: "10kb" }));

// app.use(morgan("combined"));

// // app.use(express.json());
// app.use(mongoSanatize());

// //data sanitizer
// app.use(xss());

// app.use(
//   hpp({
//     whitelist: ["duration", "limit", "average"],
//   })
// );
// //serving statc sites
// app.use(express.static(`${__dirname}/public/`));

// app.use((req, res, next) => {
//   req.getTime = new Date().toISOString();
//   next();
// });

// const corsOptions = {
//   origin: 'http://localhost:4200', // Update with your Angular app's URL
//   methods: 'GET,POST,PATCH,DELETE,OPTIONS',
//   allowedHeaders: 'Content-Type,Authorization', // Explicitly allow required headers
//   credentials: true, // Allow credentials (cookies) if needed
// };

// app.use(cors(corsOptions));
// //testing middleware

// app.use((req, res, next) => {
//   console.log('Incoming Headers:', req.headers);
//   next();
// });

// // app.use((req, res, next) => {
// //   next();
// // });

// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   // console.log(req.headers);
//   next();
// });

// app.use("/api/v1/users", usersRoutes);
// app.use("/api/v1/products", productRoutes);
// app.use("/api/v1/reviews", reviewRoutes);
// app.use("/api/v1/customer", customerRoutes);
// // app.use("/api/v1/invoice", invoiceRoutes);

// app.all("*", (req, res, next) => {
//   next(
//     new AppError(
//       `Cant find the Requested url ${req.originalUrl} on Server `,
//       404
//     )
//   );
// });

// app.use(globalErrorhandler); //errorcontroller.js

// module.exports = app;
