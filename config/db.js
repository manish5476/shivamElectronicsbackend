const mongoose = require("mongoose");
require("dotenv").config(); // Make sure to include dotenv to use environment variables

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true, // Optional for deprecation warnings
      useFindAndModify: false, // Optional for deprecation warnings
    });
    // console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); 
  }
};

// Call connectDB to initiate the connection
connectDB();
