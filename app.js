require('dotenv').config({ path: './.env' }); // Always load .env first
const express = require('express');
const morgan = require('morgan'); // HTTP request logger
const rateLimit = require('express-rate-limit'); // For rate limiting requests
const helmet = require('helmet'); // Security headers
const mongoSanitize = require('express-mongo-sanitize'); // For NoSQL query injection prevention
const xss = require('xss-clean');
const hpp = require('hpp'); // HTTP Parameter Pollution protection
const cors = require('cors'); // Cross-Origin Resource Sharing
const compression = require('compression'); // Response compression
const winston = require('winston'); // Advanced logging
const path = require('path'); // For path manipulation
const fs = require('fs'); // Required for file system operations (e.g., creating log directory)

// Import custom utilities and error handler
const globalErrorHandler = require('./Controllers/errorController');
const AppError = require('./Utils/appError');

// Import all route files
const productRoutes = require('./routes/productRoutes');
const usersRoutes = require('./routes/UserRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const invoiceRoutes = require('./routes/InvoiceRoutes');
const masterListRoutes = require('./routes/masterListRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Consistent import
// const botRoutes = require('./routes/botRoutes'); // Assuming you'll add this for your bot
require('./telegrambot/telegrambot'); // Point to the file inside the folder
const app = express();

app.set('trust proxy', 1);

// --- 1. Logger Setup ---
// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create Winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true, // Keep the latest files
            zippedArchive: true // Compress rotated logs
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true,
            zippedArchive: true
        }),
    ],
    exceptionHandlers: [ // Catch uncaught exceptions
        new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
    ],
    rejectionHandlers: [ // Catch unhandled promise rejections
        new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
    ]
});

// Add console transport for development environment
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// --- 2. Global Middleware ---
app.use(helmet());

const corsOptions = {
    // origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:4200', 'http://127.0.0.1:4200'], // More specific origins for dev, or load from env for prod
    origin: "*", // This allows all origins. Be more specific in production if possible.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Ensure all methods you use are here
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Morgan HTTP request logging based on environment
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Concise output colored for development
} else {
    // Log to file for production
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// API rate limiting
const apiLimiter = rateLimit({
    limit: 1000, // Max 1000 requests per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again after an hour.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next) => {
        next(new AppError('Too many requests from this IP, please try again after an hour.', 429));
    }
});
app.use('/api/v1', apiLimiter); // Apply rate limiting to all API v1 routes

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '50kb' })); // Limit JSON payload size
app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xss()); // Data sanitization against XSS attacks
app.use(hpp({ // Prevent HTTP Parameter Pollution
    whitelist: [
        'duration', 'average', 'page', 'limit', 'sort', 'fields', 'filter',
        'status', 'category', 'price', 'stock', 'fullname', 'email', 'name', 'shopname', 'mobileNumber',
        'level', 'startDate', 'endDate', 'userId', 'userRole', 'ipAddress', 'method', 'url', 'environment'
    ]
}));

app.use(compression()); // Compress responses

// Removed the custom middleware that logged every incoming request.
// If you need to log specific details about user login/signup,
// implement that logging within your authController functions.

// Middleware to catch invalid JSON payloads
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return next(new AppError('Invalid JSON payload provided.', 400));
    }
    next(err);
});

// --- 3. Routes ---
// Mount routes
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/sellers', sellerRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/master-list', masterListRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Serve static files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));


// --- 4. Unhandled Routes (404) ---
// Catch-all for any unhandled routes, creating a 404 error
app.all('*', (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// --- 5. Global Error Handling Middleware ---
// This middleware catches all errors passed via next(err)
app.use(globalErrorHandler);

module.exports = app;

// require('dotenv').config({ path: './.env' }); // Always load .env first
// const express = require('express');
// const morgan = require('morgan'); // HTTP request logger
// const rateLimit = require('express-rate-limit'); // For rate limiting requests
// const helmet = require('helmet'); // Security headers
// const mongoSanitize = require('express-mongo-sanitize'); // For NoSQL query injection prevention
// const xss = require('xss-clean'); 
// const hpp = require('hpp'); // HTTP Parameter Pollution protection
// const cors = require('cors'); // Cross-Origin Resource Sharing
// const compression = require('compression'); // Response compression
// const winston = require('winston'); // Advanced logging
// const path = require('path'); // For path manipulation

// // Import custom utilities and error handler
// const globalErrorHandler = require('./Controllers/errorController');
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
// // const botRoutes = require('./routes/botRoutes'); // Assuming you'll add this for your bot
// require('./telegrambot/telegrambot'); // Point to the file inside the folder
// const app = express();

// app.set('trust proxy', 1);
// // --- 1. Logger Setup ---
// // const logsDir = path.join(__dirname, 'logs');
// // if (!require('fs').existsSync(logsDir)) {
// //     require('fs').mkdirSync(logsDir);
// // }
// // const logger = winston.createLogger({
// //     level: 'info',
// //     format: winston.format.combine(
// //         winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
// //         winston.format.json()
// //     ),
// //     transports: [
// //         new winston.transports.File({
// //             filename: path.join(logsDir, 'error.log'),
// //             level: 'error',
// //             maxsize: 5242880, // 5MB
// //             maxFiles: 5,
// //             tailable: true, // Keep the latest files
// //             zippedArchive: true // Compress rotated logs
// //         }),
// //         new winston.transports.File({
// //             filename: path.join(logsDir, 'combined.log'),
// //             maxsize: 5242880, // 5MB
// //             maxFiles: 5,
// //             tailable: true,
// //             zippedArchive: true
// //         }),
// //     ],
// //     exceptionHandlers: [ // Catch uncaught exceptions
// //         new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
// //     ],
// //     rejectionHandlers: [ // Catch unhandled promise rejections
// //         new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
// //     ]
// // });

// // if (process.env.NODE_ENV === 'development') {
// //     logger.add(new winston.transports.Console({
// //         format: winston.format.combine(
// //             winston.format.colorize(),
// //             winston.format.simple()
// //         )
// //     }));
// // }

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
//     app.use(morgan('dev')); // Concise output colored for development
// } else {
//     // Log to file for production
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

// // --- 3. Routes ---
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

// app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));


// // --- 5. Unhandled Routes (404) ---
// app.all('*', (req, res, next) => {
//     next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
// });

// app.use(globalErrorHandler);
// module.exports = app;

// // require('dotenv').config({ path: './.env' });
// // const express = require('express');
// // const morgan = require('morgan');
// // const rateLimit = require('express-rate-limit');
// // const helmet = require('helmet');
// // const mongoSanitize = require('express-mongo-sanitize');
// // const xss = require('xss');
// // const hpp = require('hpp');
// // const cors = require('cors');

// // const compression = require('compression');
// // const winston = require('winston');
// // const globalErrorHandler = require('./Controllers/errorController');
// // const AppError = require('./Utils/appError');
// // const productRoutes = require('./routes/productRoutes');
// // const usersRoutes = require('./routes/UserRoutes');
// // const reviewRoutes = require('./routes/reviewRoutes');
// // const customerRoutes = require('./routes/customerRoutes');
// // const paymentRoutes = require('./routes/paymentRoutes');
// // const sellerRoutes = require('./routes/sellerRoutes');
// // const invoiceRoutes = require('./routes/InvoiceRoutes');
// // const masterListRoutes = require('./routes/masterListRoutes');
// // const statisticsRoutes = require('./routes/statisticsRoutes');
// // const analyticsRoutes = require('./routes/analyticsRoutes');

// // const app = express();
// // // require('./telegrambot/telegrambot.js');
// // app.set('trust proxy', 1);

// // // Logger Setup
// // const logger = winston.createLogger({
// //   level: 'info',
// //   format: winston.format.combine(
// //     winston.format.timestamp(),
// //     winston.format.json()
// //   ),
// //   transports: [
// //     new winston.transports.File({
// //       filename: 'logs/error.log',
// //       level: 'error',
// //       maxsize: 5242880, // 5MB
// //       maxFiles: 5,
// //     }),
// //     new winston.transports.File({
// //       filename: 'logs/combined.log',
// //       maxsize: 5242880,
// //       maxFiles: 5,
// //     }),
// //   ],
// // });

// // // Security Middleware
// // app.use(helmet());

// // // CORS Configuration
// // // const corsOptions = {
// // //   // origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'https://shivam-electronics-2.vercel.app',
// // //   origin: '*', // Allow all origins
// // //   methods: 'GET,POST,PATCH,DELETE,OPTIONS',
// // //   allowedHeaders: 'Content-Type,Authorization',
// // //   credentials: true,
// // // };
// // // app.use(cors(corsOptions));
// // // app.options('*', cors(corsOptions));

// // // // Logging Middleware
// // // if (process.env.NODE_ENV === 'development') {
// // //   app.use(morgan('dev'));
// // // } else {
// // //   app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
// // // }

// // // Rate Limiter
// // // const limiter = rateLimit({
// // //   max: 500,
// // //   windowMs: 60 * 60 * 1000,
// // //   message: 'Too many requests from this IP, please try again in an hour',
// // // });
// // const limiter = rateLimit({
// //   limit: 1000, // Changed from `max` to `limit`
// //   windowMs: 60 * 60 * 1000,
// //   message: { error: 'Too many requests from this IP, please try again in an hour' },
// //   standardHeaders: true,
// //   legacyHeaders: false,
// // });
// // app.use('/api/v1', limiter);

// // // Body Parser & Compression
// // app.use(express.json({ limit: '10kb' }));
// // app.use(compression());

// // // Data Sanitization
// // app.use(mongoSanitize());
// // // app.use(xss());
// // app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));


// // function sanitizeRequest(req, res, next) {
// //   req.body = JSON.parse(JSON.stringify(req.body), (key, value) =>
// //     typeof value === 'string' ? xss(value) : value
// //   );
// //   next();
// // }

// // app.use(sanitizeRequest);
// // app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));

// // //
// // // Static Files
// // app.use('/public', express.static(`${__dirname}/public`, { maxAge: '1d', dotfiles: 'deny' }));

// // // Request Timing
// // app.use((req, res, next) => {
// //   req.requestTime = new Date().toISOString();
// //   next();
// // });

// // // JSON Error Handling
// // app.use((err, req, res, next) => {
// //   if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
// //     return next(new AppError('Invalid JSON payload', 400));
// //   }
// //   next(err);
// // });

// // // Routes
// // app.use('/api/v1/users', usersRoutes);
// // app.use('/api/v1/products', productRoutes);
// // app.use('/api/v1/reviews', reviewRoutes);
// // app.use('/api/v1/customers', customerRoutes);
// // app.use('/api/v1/payments', paymentRoutes);
// // app.use('/api/v1/sellers', sellerRoutes);
// // app.use('/api/v1/invoices', invoiceRoutes);
// // app.use('/api/v1/master-list', masterListRoutes);
// // app.use('/api/v1/statistics', statisticsRoutes);
// // app.use('/api/v1/analytics', analyticsRoutes);
// // app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
// // // Catch-All Route
// // app.all('*', (req, res, next) => {
// //   next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
// // });

// // // Global Error Handler
// // app.use(globalErrorHandler);

// // module.exports = app;
