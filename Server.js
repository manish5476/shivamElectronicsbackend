const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");
console.log(process.env.NODE_ENV);

mongoose
  .connect(
    `mongodb+srv://msms5476mmmm:ms201426@shivamelectronics.ahdcm.mongodb.net/?retryWrites=true&w=majority&appName=ShivamElectronics`
  )
  .then((con) => {});

const cors = require("cors");
app.use(cors());

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
