const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load the .env file passed as an argument, default to .env.dev if none provided
const envFile = process.argv[2] || ".env.dev";
dotenv.config({ path: envFile });

const app = require("./app");

mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown for Nodemon
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server closed.");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});

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
//   });

// const port = process.env.PORT || 4000;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
// });

// // const mongoose = require("mongoose");
// // const dotenv = require("dotenv");

// // // Determine environment from command-line argument or NODE_ENV
// // const envArg = process.argv.find(arg => arg.startsWith("--config"));
// // const envFile = envArg ? envArg.split("=")[1] : `.env.${process.env.NODE_ENV || 'dev'}`;
// // dotenv.config({ path: envFile });

// // const app = require("./app");

// // mongoose
// //   .connect(process.env.DATABASE)
// //   .then(() => {
// //     console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
// //   })
// //   .catch((err) => {
// //     console.error("Database connection error:", err);
// //   });

// // const port = process.env.PORT || 4000;
// // app.listen(port, () => {
// //   console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
// // });
// // // // const mongoose = require("mongoose");
// // // // const dotenv = require("dotenv");
// // // // dotenv.config({ path: "./config.env" });
// // // // const app = require("./app");
// // // // // console.log(process.env.NODE_ENV);

// // // // mongoose
// // // //   .connect(
// // // //     process.env.DATABASE
// // // //   )
// // // //   .then((con) => { });



// // // // const port = process.env.PORT || 4000;
// // // // app.listen(port, () => {
// // // //   console.log(`Server is running on port ${port}`);
// // // // });
// // // const mongoose = require("mongoose");
// // // const dotenv = require("dotenv");

// // // // Load the appropriate .env file based on NODE_ENV
// // // const envFile = `.env.${process.env.NODE_ENV || 'dev'}`; // Default to dev if NODE_ENV not set
// // // dotenv.config({ path: envFile });

// // // const app = require("./app");

// // // mongoose
// // //   .connect(process.env.DATABASE)
// // //   .then(() => {
// // //     console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
// // //   })
// // //   .catch((err) => {
// // //     console.error("Database connection error:", err);
// // //   });

// // // const port = process.env.PORT || 4000;
// // // app.listen(port, () => {
// // //   console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
// // // });