// server.js
// --------------------
// 1. ENVIRONMENT SETUP
// --------------------
const envFile = process.argv[2] || '.env.dev';
require('dotenv').config({ path: envFile });

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 4000;
const DB_URI = process.env.DATABASE;

// --------------------
// 2. DATABASE CONNECT
// --------------------
async function connectDB() {
  try {
    await mongoose.connect(DB_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB connected (${process.env.NODE_ENV})`);
  } catch (err) {
    console.error('💥 Database connection failed:', err.message);
    process.exit(1);
  }
}

// --------------------
// 3. SERVER STARTUP
// --------------------
let server;

async function startServer() {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

// --------------------
// 4. ERROR HANDLERS
// --------------------
const handleFatalError = (type) => (err) => {
  console.error(`💥 ${type} detected!`);
  console.error(err.stack || err);

  shutdown(1); // exit with failure
};

process.on('unhandledRejection', handleFatalError('UNHANDLED REJECTION'));
process.on('uncaughtException', handleFatalError('UNCAUGHT EXCEPTION'));

// --------------------
// 5. GRACEFUL SHUTDOWN
// --------------------
async function shutdown(exitCode = 0) {
  try {
    console.log('👋 Shutting down gracefully...');

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ HTTP server closed.');
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed.');
    }
  } catch (err) {
    console.error('💥 Error during shutdown:', err);
  } finally {
    process.exit(exitCode);
  }
}

process.on('SIGINT', () => shutdown(0));  // Ctrl+C
process.on('SIGTERM', () => shutdown(0)); // Deployment stop

// --------------------
// 6. BOOTSTRAP
// --------------------
startServer();








// // Load environment variables first. This allows specifying a config file via command line.
// const envFile = process.argv[2] || '.env.dev';
// require('dotenv').config({ path: envFile });

// const mongoose = require('mongoose');
// const app = require('./app'); // Your main Express app
// // const bot = require('./telegrambot/telegrambot'); // Uncomment when your bot is ready

// // --- 1. DATABASE CONNECTION ---
// mongoose
//     .connect(process.env.DATABASE)
//     .then(() => { console.log(`✅ Connected to MongoDB (${process.env.NODE_ENV})`);})
//     .catch((err) => {
//         console.error('💥 DATABASE CONNECTION ERROR:', err);
//         process.exit(1); // Exit the process if DB connection fails
//     });

// // --- 2. START THE SERVER ---
// const port = process.env.PORT || 4000;
// const server = app.listen(port, () => {
//     console.log(`🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
//     // --- TELEGRAM WEBHOOK SETUP (Optional) ---
//     // This block sets up your Telegram bot's webhook, essential for production.
//     // const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
//     // if (RENDER_EXTERNAL_URL && bot) {
//     //     const webhookUrl = `${RENDER_EXTERNAL_URL}/telegram-webhook`;
//     //     bot.setWebHook(webhookUrl)
//     //         .then(() => console.log(`✅ Telegram Webhook set to: ${webhookUrl}`))
//     //         .catch(err => console.error('❌ Error setting Telegram Webhook:', err.message));
//     // } else if (!RENDER_EXTERNAL_URL) {
//     //     console.warn('⚠️ RENDER_EXTERNAL_URL not set. Webhook will not be configured.');
//     // }
// });

// // --- 3. GRACEFUL SHUTDOWN AND ERROR HANDLING ---
// // Handles critical errors that were not caught elsewhere (e.g., programming bugs)
// const handleFatalError = (errorType) => (err) => {
//     console.error(`💥 ${errorType}! Shutting down...`);
//     console.error(err.name, err.message);
//     console.error(err.stack); // Log the full stack trace for debugging
//     server.close(() => {
//         process.exit(1);
//     });
// };

// process.on('unhandledRejection', handleFatalError('UNHANDLED REJECTION'));
// process.on('uncaughtException', handleFatalError('UNCAUGHT EXCEPTION'));

// // Handles server shutdown signals (e.g., from Ctrl+C or deployment services)
// const gracefulShutdown = async (signal) => {
//     console.log(`👋 ${signal} received. Shutting down gracefully...`);
//     server.close(async () => {
//         console.log('✅ HTTP server closed.');
//         await mongoose.connection.close(false);
//         console.log('✅ MongoDB connection closed.');
//         process.exit(0);
//     });
// };

// process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
