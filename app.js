// app.js
// Load .env here (safe: dotenv won't override vars already set by Server.js)
require("dotenv").config({ path: "./.env" });

const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const winston = require("winston");
const path = require("path");
const fs = require("fs");

const globalErrorHandler = require("./middleWare/errorController");
const AppError = require("./Utils/appError");

// --- Routes ---
const productRoutes = require("./routes/productRoutes");
const usersRoutes = require("./routes/UserRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const customerRoutes = require("./routes/customerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const masterListRoutes = require("./routes/masterListRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const permissionsRouter = require("./routes/permissionsRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); // <-- ADD THIS LINE
// const advancedAnalyticsRoutes = require("./routes/advancedAnalyticsRoutes");
const emiRoutes = require("./routes/emiRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
app.set("trust proxy", 1);

// ------------------------------
// 1) Logger (Winston + files)
// ------------------------------
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, "exceptions.log"),
        }),
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, "rejections.log"),
        }),
    ],
});

// NOTE: fix typo: process.env.NODE_ENV (no stray space)
if (process.env.NODE_ENV === "development") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    );
}

// --------------------------------------------------
// 2) Security, CORS, logging, rate-limiting, parsing
// --------------------------------------------------
app.use(helmet());

// CORS (allow all by default; restrict via env if needed)
app.use(
    cors({
        // origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Content-Type,Authorization",
        credentials: true,
        optionsSuccessStatus: 204,
    }),
);

// HTTP logs -> winston in prod, console in dev
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(
        morgan("combined", {
            stream: { write: (msg) => logger.info(msg.trim()) },
        }),
    );
}

// Global rate limiter for API
app.use(
    "/api/v1",
    rateLimit({
        limit: 1000,
        windowMs: 60 * 60 * 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message:
            "Too many requests from this IP, please try again after an hour.",
        handler: (req, res, next) =>
            next(
                new AppError(
                    "Too many requests from this IP, please try again after an hour.",
                    429,
                ),
            ),
    }),
);

// Body parsing
app.use(express.json({ limit: "50kb" }));

// Handle bad JSON early (must be after express.json and before routes)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return next(new AppError("Invalid JSON payload provided.", 400));
    }
    next(err);
});

// Sanitization & hardening
app.use(mongoSanitize());
app.use(xss());
app.use(
    hpp({
        whitelist: [
            "duration",
            "average",
            "page",
            "limit",
            "sort",
            "fields",
            "filter",
            "status",
            "category",
            "price",
            "stock",
            "fullname",
            "email",
            "name",
            "shopname",
            "mobileNumber",
            "level",
            "startDate",
            "endDate",
            "userId",
            "userRole",
            "ipAddress",
            "method",
            "url",
            "environment",
        ],
    }),
);

app.use(compression());

// Request context log (simple)
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    logger.info(
        `Incoming Request: ${req.method} ${req.originalUrl} from IP: ${req.ip}`,
    );
    next();
});

// ------------
// 3) Routes
// ------------
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        env: process.env.NODE_ENV,
        ts: new Date().toISOString(),
    });
});

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/sellers", sellerRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/master-list", masterListRoutes);
app.use("/api/v1/statistics", statisticsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/permissions", permissionsRouter);
app.use("/api/v1/transactions", transactionRoutes); // <-- ADD THIS LINE
app.use("/api/v1/emis", emiRoutes);
app.use("/api/v1/purchase-orders", purchaseOrderRoutes);
app.use("/api/v1/reports", reportRoutes);

// Static assets
app.use(
    "/public",
    express.static(path.join(__dirname, "public"), {
        maxAge: "1d",
        dotfiles: "deny",
    }),
);

// -------------------------
// 4) 404 + Global Error MW
// -------------------------
// Single 404 handler -> pass to global error handler
app.all("*", (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Single centralized error handler
app.use(globalErrorHandler);

module.exports = app;

// require('dotenv').config({ path: './.env' }); // Always load .env first
// const express = require('express');
// const morgan = require('morgan'); // HTTP request logger
// const rateLimit = require('express-rate-limit'); // For rate limiting requests
// const helmet = require('helmet'); // Security headers
// const mongoSanitize = require('express-mongo-sanitize'); // For NoSQL query injection prevention
// const xss = require('xss-clean'); // Cross-site scripting (XSS) clean
// const hpp = require('hpp'); // HTTP Parameter Pollution protection
// const cors = require('cors'); // Cross-Origin Resource Sharing
// const compression = require('compression'); // Response compression
// const winston = require('winston'); // Advanced logging
// const path = require('path'); // For path manipulation

// // Import custom utilities and error handler
// // const globalErrorHandler = require('./Controllers/errorController');
// const globalErrorHandler = require('./middleWare/errorController');
// const AppError = require('./Utils/appError');

// // Import all route files
// const productRoutes = require('./routes/productRoutes');
// const usersRoutes = require('./routes/UserRoutes');
// const reviewRoutes = require('./routes/reviewRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
// const sellerRoutes = require('./routes/sellerRoutes');
// const invoiceRoutes = require('./routes/InvoiceRoutes');
// const masterListRoutes = require('./routes/masterListRoutes');
// const statisticsRoutes = require('./routes/statisticsRoutes');
// const analyticsRoutes = require('./routes/analyticsRoutes');
// const dashboardRoutes = require('./routes/dashboardRoutes'); // Consistent import
// const permissionsRouter= require('./routes/permissionsRoutes')
// // const botRoutes = require('./routes/botRoutes'); // Assuming you'll add this for your bot
// // require('./telegrambot/telegrambot'); // Point to the file inside the folder
// const app = express();

// app.set('trust proxy', 1);

// // --- 1. Logger Setup ---
// const logsDir = path.join(__dirname, 'logs');
// if (!require('fs').existsSync(logsDir)) {
//     require('fs').mkdirSync(logsDir);
// }
// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.combine(
//         winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//         winston.format.json()
//     ),
//     transports: [
//         new winston.transports.File({
//             filename: path.join(logsDir, 'error.log'),
//             level: 'error',
//             maxsize: 5242880, // 5MB
//             maxFiles: 5,
//             tailable: true, // Keep the latest files
//             zippedArchive: true // Compress rotated logs
//         }),
//         new winston.transports.File({
//             filename: path.join(logsDir, 'combined.log'),
//             maxsize: 5242880, // 5MB
//             maxFiles: 5,
//             tailable: true,
//             zippedArchive: true
//         }),
//     ],
//     exceptionHandlers: [ // Catch uncaught exceptions
//         new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
//     ],
//     rejectionHandlers: [ // Catch unhandled promise rejections
//         new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
//     ]
// });

// if (process.env .NODE_ENV === 'development') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.combine(
//             winston.format.colorize(),
//             winston.format.simple()
//         )
//     }));
// }

// app.use(helmet());

// const corsOptions = {
//     // origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:4200', 'http://127.0.0.1:4200'], // More specific origins for dev, or load from env for prod
//     origin: "*",
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Ensure all methods you use are here
//     allowedHeaders: 'Content-Type,Authorization',
//     credentials: true,
//     optionsSuccessStatus: 204
// };
// app.use(cors(corsOptions));

// if (process.env.NODE_ENV === 'development') {
//     app.use(morgan('dev'));
// } else {
//     app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
// }

// const apiLimiter = rateLimit({
//     limit: 1000,
//     windowMs: 60 * 60 * 1000,
//     message: 'Too many requests from this IP, please try again after an hour.',
//     standardHeaders: true,
//     legacyHeaders: false,
//     handler: (req, res, next) => {
//         next(new AppError('Too many requests from this IP, please try again after an hour.', 429));
//     }
// });

// app.use('/api/v1', apiLimiter);

// app.use(express.json({ limit: '50kb' }));
// app.use(mongoSanitize());
// app.use(xss());
// app.use(hpp({
//     whitelist: [
//         'duration', 'average', 'page', 'limit', 'sort', 'fields', 'filter',
//         'status', 'category', 'price', 'stock', 'fullname', 'email', 'name', 'shopname', 'mobileNumber',
//         'level', 'startDate', 'endDate', 'userId', 'userRole', 'ipAddress', 'method', 'url', 'environment'
//     ]
// }));

// app.use(compression());
// app.use((req, res, next) => {
//     req.requestTime = new Date().toISOString();
//     logger.info(`Incoming Request: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
//     next();
// });

// app.use((err, req, res, next) => {
//     if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
//         return next(new AppError('Invalid JSON payload provided.', 400));
//     }
//     next(err);
// });

// // // --- 3. Routes ---
// // Mount routes
// app.use('/api/v1/users', usersRoutes);
// app.use('/api/v1/products', productRoutes);
// app.use('/api/v1/reviews', reviewRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/sellers', sellerRoutes);
// app.use('/api/v1/invoices', invoiceRoutes);
// app.use('/api/v1/master-list', masterListRoutes);
// app.use('/api/v1/statistics', statisticsRoutes); // Assuming these are admin dashboard routes
// app.use('/api/v1/analytics', analyticsRoutes); // Assuming these are admin dashboard routes
// app.use('/api/v1/dashboard', dashboardRoutes); // Using consistent variable name
// app.use("/api/v1/permissions", permissionsRouter);
// app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));

// // 404 handler
// app.all('*', (req, res, next) => {
//   res.status(404).json({
//     status: 'fail',
//     message: `Can't find ${req.originalUrl} on this server!`
//   });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('🔥 ERROR:', err.stack || err);
//   res.status(err.statusCode || 500).json({
//     status: 'error',
//     message: err.message || 'Internal Server Error'
//   });
// });

// // --- 5. Unhandled Routes (404) ---
// app.all('*', (req, res, next) => {
//     next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
// });
// app.use(globalErrorHandler);
// module.exports = app;
