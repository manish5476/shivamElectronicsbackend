const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config(); // Make sure to include dotenv to use environment variables

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Optional for deprecation warnings
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process with failure code
  }
};

// Call connectDB to initiate the connection
connectDB();

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
