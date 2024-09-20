const express = require("express");
const app = express();
app.use(express.json());
const morgan = require("morgan");

const productRoutes = require("./routes/product");
// const usersRoutes = require("./routes/auth");

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
const cors = require("cors");
app.use(cors());

app.use(morgan("combined"));
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  req.getTime = new Date().toISOString();
  next();
});
app.use(express.static(`${__dirname}/public/`));

// app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/Product", productRoutes);

module.exports = app;
