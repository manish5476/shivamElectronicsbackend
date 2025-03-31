require('dotenv').config({ path: './.env' });
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
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
const masterListRoutes = require('./routes/masterListRoutes');

const app = express();

// Logger Setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
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
// const limiter = rateLimit({
//   max: 500,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour',
// });
const limiter = rateLimit({
  limit: 500, // Changed from `max` to `limit`
  windowMs: 60 * 60 * 1000,
  message: { error: 'Too many requests from this IP, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1', limiter);

// Body Parser & Compression
app.use(express.json({ limit: '10kb' }));
app.use(compression());

// Data Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));


function sanitizeRequest(req, res, next) {
  req.body = JSON.parse(JSON.stringify(req.body), (key, value) =>
    typeof value === 'string' ? xss(value) : value
  );
  next();
}

app.use(sanitizeRequest);
app.use(hpp({ whitelist: ['duration', 'limit', 'average'] }));

// 
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
app.use('/api/v1/master-list', masterListRoutes);

// Catch-All Route
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
