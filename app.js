require('dotenv').config({ path: './.env' }); // Always load .env first
const express = require('express');
const morgan = require('morgan'); // HTTP request logger
const rateLimit = require('express-rate-limit'); // For rate limiting requests
const helmet = require('helmet'); // Security headers
const mongoSanitize = require('express-mongo-sanitize'); // For NoSQL query injection prevention
const xss = require('xss-clean'); // Cross-site scripting (XSS) clean
const hpp = require('hpp'); // HTTP Parameter Pollution protection
const cors = require('cors'); // Cross-Origin Resource Sharing
const compression = require('compression'); // Response compression
const winston = require('winston'); // Advanced logging
const path = require('path'); // For path manipulation

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

const app = express();

// Trust proxy for secure headers (e.g., X-Forwarded-For for IP)
app.set('trust proxy', 1);

// --- 1. Logger Setup ---
// Create 'logs' directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!require('fs').existsSync(logsDir)) {
    require('fs').mkdirSync(logsDir);
}

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

// Add console transport only in development
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// --- 2. Global Middleware ---

// Security HTTP Headers
app.use(helmet());

// CORS Configuration - IMPORTANT: Configure carefully for production
// Remove the `app.options('*', cors(corsOptions));` if `app.use(cors(corsOptions));` is before routes.
// The `cors` middleware typically handles pre-flight OPTIONS requests automatically.
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:4200', 'http://127.0.0.1:4200'], // More specific origins for dev, or load from env for prod
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Ensure all methods you use are here
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
    optionsSuccessStatus: 204 // For preflight requests
};
app.use(cors(corsOptions));

// Logging Middleware (HTTP Request Logger)
// Uncommented and configured properly
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Concise output colored for development
} else {
    // Log to file for production
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiting: Apply to all /api/v1 requests
// Adjust limit and windowMs based on your application's needs
const apiLimiter = rateLimit({
    limit: 1000, // Max 1000 requests per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again after an hour.',
    standardHeaders: true, // Return rate limit info in the headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    // Optional: handler to customize response for rate-limited requests
    handler: (req, res, next) => {
        next(new AppError('Too many requests from this IP, please try again after an hour.', 429));
    }
});
app.use('/api/v1', apiLimiter);


// Body parser, reading data from body into req.body
// Increased limit for larger payloads if needed (e.g., image uploads base64)
app.use(express.json({ limit: '50kb' })); // Adjusted limit for potentially larger requests

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS attacks
// Use xss-clean for robust XSS protection on input
app.use(xss()); // This middleware cleans req.body, req.query, and req.params

// Prevent parameter pollution
// Whitelist parameters that are expected to be duplicated in queries (e.g., sort=name&sort=price)
app.use(hpp({
    whitelist: [
        'duration', 'limit', 'average', // Existing whitelisted params
        // Add more parameters that might appear multiple times in query strings, e.g.:
        // 'price', 'ratingsAverage', 'ratingsQuantity', 'maxPrice', 'minPrice', 'category', 'brand'
    ]
}));

// Request compression for all responses
app.use(compression());

// Custom middleware to add request timestamp
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    logger.info(`Incoming Request: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    next();
});

// JSON parsing error handling
// This catches syntax errors in JSON body before other middleware processes it
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
app.use('/api/v1/statistics', statisticsRoutes); // Assuming these are admin dashboard routes
app.use('/api/v1/analytics', analyticsRoutes); // Assuming these are admin dashboard routes
app.use('/api/v1/dashboard', dashboardRoutes); // Using consistent variable name
// app.use('/api/v1/bot', botRoutes); // New route for your helping bot

// --- 4. Serve Static Files (if any) ---
// Make sure the path is correct from the root of your project, assuming 'public' is a top-level folder
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1d', dotfiles: 'deny' }));


// --- 5. Unhandled Routes (404) ---
app.all('*', (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// --- 6. Global Error Handling Middleware ---
// This must be the last middleware in the chain
app.use(globalErrorHandler);

module.exports = app;

// require('dotenv').config({ path: './.env' });
// const express = require('express');
// const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
// const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss');
// const hpp = require('hpp');
// const cors = require('cors');

// const compression = require('compression');
// const winston = require('winston');
// const globalErrorHandler = require('./Controllers/errorController');
// const AppError = require('./Utils/appError');
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

// const app = express();
// // require('./telegrambot/telegrambot.js'); 
// app.set('trust proxy', 1);

// // Logger Setup
// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.File({
//       filename: 'logs/error.log',
//       level: 'error',
//       maxsize: 5242880, // 5MB
//       maxFiles: 5,
//     }),
//     new winston.transports.File({
//       filename: 'logs/combined.log',
//       maxsize: 5242880,
//       maxFiles: 5,
//     }),
//   ],
// });

// // Security Middleware
// app.use(helmet());

// // CORS Configuration
// // const corsOptions = {
// //   // origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'https://shivam-electronics-2.vercel.app',
// //   origin: '*', // Allow all origins
// //   methods: 'GET,POST,PATCH,DELETE,OPTIONS',
// //   allowedHeaders: 'Content-Type,Authorization',
// //   credentials: true,
// // };
// // app.use(cors(corsOptions));
// // app.options('*', cors(corsOptions));

// // // Logging Middleware
// // if (process.env.NODE_ENV === 'development') {
// //   app.use(morgan('dev'));
// // } else {
// //   app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
// // }

// // Rate Limiter
// // const limiter = rateLimit({
// //   max: 500,
// //   windowMs: 60 * 60 * 1000,
// //   message: 'Too many requests from this IP, please try again in an hour',
// // });
// const limiter = rateLimit({
//   limit: 1000, // Changed from `max` to `limit`
//   windowMs: 60 * 60 * 1000,
//   message: { error: 'Too many requests from this IP, please try again in an hour' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use('/api/v1', limiter);

// // Body Parser & Compression
// app.use(express.json({ limit: '10kb' }));
// app.use(compression());

// // Data Sanitization
// app.use(mongoSanitize());
// // app.use(xss());
// app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));


// function sanitizeRequest(req, res, next) {
//   req.body = JSON.parse(JSON.stringify(req.body), (key, value) =>
//     typeof value === 'string' ? xss(value) : value
//   );
//   next();
// }

// app.use(sanitizeRequest);
// app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));

// // 
// // Static Files
// app.use('/public', express.static(`${__dirname}/public`, { maxAge: '1d', dotfiles: 'deny' }));

// // Request Timing
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   next();
// });

// // JSON Error Handling
// app.use((err, req, res, next) => {
//   if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
//     return next(new AppError('Invalid JSON payload', 400));
//   }
//   next(err);
// });

// // Routes
// app.use('/api/v1/users', usersRoutes);
// app.use('/api/v1/products', productRoutes);
// app.use('/api/v1/reviews', reviewRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/sellers', sellerRoutes);
// app.use('/api/v1/invoices', invoiceRoutes);
// app.use('/api/v1/master-list', masterListRoutes);
// app.use('/api/v1/statistics', statisticsRoutes);
// app.use('/api/v1/analytics', analyticsRoutes);
// app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
// // Catch-All Route
// app.all('*', (req, res, next) => {
//   next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
// });

// // Global Error Handler
// app.use(globalErrorHandler);

// module.exports = app;
