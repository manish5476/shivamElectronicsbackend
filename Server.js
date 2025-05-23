// Server.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path"); // Added path module

// --- 1. Load environment variables first and foremost ---
// This ensures process.env is populated before other modules are imported
const envFile = process.argv[2] || ".env.dev"; // Get env file from command line arg or default
const dotenvPath = path.resolve(__dirname, envFile); 
dotenv.config({ path: dotenvPath });

console.log(`DEBUG: Attempting to load .env file from: ${dotenvPath}`);
console.log(`DEBUG: TELEGRAM_BOT_TOKEN value in Server.js: ${process.env.TELEGRAM_BOT_TOKEN ? 'Loaded' : 'NOT LOADED'}`);


// --- 2. Import your Express app and Telegram bot instance ---
const app = require("./app"); // Import your Express app from app.js
const telegramBot = require("./telegrambot/telegrambot.js"); // Import the bot instance


// --- 3. MongoDB Connection ---
mongoose
    .connect(process.env.DATABASE) // Ensure process.env.DATABASE is set in your .env files
    .then(() => {
        console.log(`Connected to MongoDB (${process.env.NODE_ENV || 'development'})`);
    })
    .catch((err) => {
        console.error("Database connection error:", err);
        process.exit(1); // Exit process on DB connection failure
    });


// --- 4. Setup Telegram Webhook Endpoint on the Express app ---
// This is the route Telegram will send updates TO
app.post(`/telegram-webhook`, (req, res) => {
    if (!req.body) {
        console.error('Received empty webhook body from Telegram');
        return res.status(400).send('No body provided');
    }
    // Pass the raw update to the bot instance for processing
    telegramBot.processUpdate(req.body); 
    res.sendStatus(200); // Important: Respond quickly to Telegram (within 5 seconds)
});


// --- 5. Start the Server and Set Webhook ---
const PORT = process.env.PORT || 4000; // Use port 4000 as per your original Server.js

const server = app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

    // Define your webhook URL. This MUST be your public domain.
    // For Render.com, it will be https://your-service-name.onrender.com/telegram-webhook
    const webhookUrl = `https://shivamelectronicsbackend.onrender.com/telegram-webhook`; 
    
    try {
        await telegramBot.setWebHook(webhookUrl);
        console.log(`Telegram webhook successfully set to: ${webhookUrl}`);
    } catch (err) {
        console.error('Error setting Telegram webhook:', err.message);
        // Add more detailed error logging for debugging
        if (err.response) { 
            console.error('Telegram API Response Data:', err.response.data);
        } else if (err.code) {
            console.error('Telegram Bot Error Code:', err.code);
        }
    }
});

// --- Graceful Shutdown ---
async function shutdown() {
    console.log("Shutting down server...");
    // Close HTTP server first
    server.close(async () => {
        console.log("HTTP server closed.");
        // Then close MongoDB connection
        await mongoose.connection.close(); 
        console.log("MongoDB connection closed.");
        process.exit(0);
    });
}

process.on("SIGINT", shutdown); // Ctrl+C
process.on("SIGTERM", shutdown); // Sent by process managers like Render
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

