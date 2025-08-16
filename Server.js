// Load environment variables first. This allows specifying a config file via command line.
const envFile = process.argv[2] || '.env.dev';
require('dotenv').config({ path: envFile });

const mongoose = require('mongoose');
const app = require('./app'); // Your main Express app
// const bot = require('./telegrambot/telegrambot'); // Uncomment when your bot is ready

// --- 1. DATABASE CONNECTION ---
mongoose
    .connect(process.env.DATABASE)
    .then(() => { console.log(`✅ Connected to MongoDB (${process.env.NODE_ENV})`);})
    .catch((err) => {
        console.error('💥 DATABASE CONNECTION ERROR:', err);
        process.exit(1); // Exit the process if DB connection fails
    });

// --- 2. START THE SERVER ---
const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
    // --- TELEGRAM WEBHOOK SETUP (Optional) ---
    // This block sets up your Telegram bot's webhook, essential for production.
    // const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    // if (RENDER_EXTERNAL_URL && bot) {
    //     const webhookUrl = `${RENDER_EXTERNAL_URL}/telegram-webhook`;
    //     bot.setWebHook(webhookUrl)
    //         .then(() => console.log(`✅ Telegram Webhook set to: ${webhookUrl}`))
    //         .catch(err => console.error('❌ Error setting Telegram Webhook:', err.message));
    // } else if (!RENDER_EXTERNAL_URL) {
    //     console.warn('⚠️ RENDER_EXTERNAL_URL not set. Webhook will not be configured.');
    // }
});

// --- 3. GRACEFUL SHUTDOWN AND ERROR HANDLING ---
// Handles critical errors that were not caught elsewhere (e.g., programming bugs)
const handleFatalError = (errorType) => (err) => {
    console.error(`💥 ${errorType}! Shutting down...`);
    console.error(err.name, err.message);
    console.error(err.stack); // Log the full stack trace for debugging
    server.close(() => {
        process.exit(1);
    });
};

process.on('unhandledRejection', handleFatalError('UNHANDLED REJECTION'));
process.on('uncaughtException', handleFatalError('UNCAUGHT EXCEPTION'));

// Handles server shutdown signals (e.g., from Ctrl+C or deployment services)
const gracefulShutdown = async (signal) => {
    console.log(`👋 ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        console.log('✅ HTTP server closed.');
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


// const mongoose = require("mongoose");
// const dotenv = require("dotenv");

// // Load the .env file passed as an argument, default to .env.dev if none provided
// const envFile = process.argv[2] || ".env.dev";
// dotenv.config({ path: envFile });

// const app = require("./app");

// mongoose
//   .connect(process.env.DATABASE)
//   .then(() => {
//     console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
//   })
//   .catch((err) => {
//     console.error("Database connection error:", err);
//     process.exit(1);
//   });

// const port = process.env.PORT || 4000;
// const server = app.listen(port, () => {
//   console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
// });

// async function shutdown() {
//   console.log("Shutting down server...");
//   await mongoose.connection.close(); // Remove callback
//   console.log("MongoDB connection closed.");
//   process.exit(0);
// }

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);

/*
const app = require('./app'); // Assuming your Express app is in 'app.js'
const mongoose = require('mongoose');
const bot = require('./telegrambot/telegrambot'); // Import the bot instance

// Load environment variables (keep this at the top)
// This path argument allows you to specify the .env file, e.g., node Server.js .env.prod
const envFile = process.argv[2] || ".env.dev";
require('dotenv').config({ path: envFile }); // Use require('dotenv').config() directly

const port = process.env.PORT || 4000; // Use port 4000 as default from your new code
const DB_URI = process.env.DATABASE; // Use process.env.DATABASE as per your new code
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; // Render provides this for your public URL

// Database Connection
mongoose
  .connect(DB_URI)
  .then(() => {
    console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

// Start the Express server
const server = app.listen(port, async () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);

  // Set up the Telegram webhook after the server starts
  if (RENDER_EXTERNAL_URL) {
    const webhookUrl = `${RENDER_EXTERNAL_URL}/telegram-webhook`;
    try {
      await bot.setWebHook(webhookUrl);
      console.log(`Telegram Webhook set to: ${webhookUrl}`);
    } catch (err) {
      console.error('Error setting Telegram Webhook:', err.message);
    }
  } else {
    console.warn('RENDER_EXTERNAL_URL not set. Webhook will not be configured automatically.');
    console.warn('If running locally, you might need ngrok or similar for webhooks, or stick to polling.');
  }
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down server...");
  try {
    await mongoose.connection.close(); // Close MongoDB connection
    console.log("MongoDB connection closed.");
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  }
  server.close(() => { // Close Express server
    console.log("Express server closed.");
    process.exit(0);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  shutdown(); // Call graceful shutdown
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  shutdown(); // Call graceful shutdown
});

// Listen for termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
*/