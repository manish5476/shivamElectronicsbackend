// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const authController = require("../Controllers/authController");
const usercontroller = require("../Controllers/usercontroller");
const reviewController = require("../Controllers/reviewController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updateUserPassword
);
module.exports = router;

router.route("/:id").get(usercontroller.getAllUsersById);

router.route("/").get(usercontroller.getAllUsers);
router
  .route("/updateMe")
  .patch(authController.protect, usercontroller.updateMe);
router
  .route("/deleteMe")
  .delete(authController.protect, usercontroller.deleteMe);

// do not update password with this
router.route("/updateUser/:id").patch(usercontroller.updateUser);
router
  .route("/deleteUser/:id")
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    usercontroller.deleteUser
  );
