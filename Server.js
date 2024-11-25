const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");
console.log(process.env.NODE_ENV);

mongoose
  .connect(
    process.env.DATABASE
  )
  .then((con) => {});

const cors = require("cors");
app.use(cors());

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
