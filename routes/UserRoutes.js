// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const authController = require("../Controllers/authController");
const User = require("../Controllers/usercontroller");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch("/updatePassword",authController.protect ,authController.updateUserPassword)
module.exports = router;

router  
  .route("/:id")
  .get(User.getAllUsersById)

router.route("/").get(User.getAllUsers)
