const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const usercontroller = require('../Controllers/usercontroller');

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// All subsequent routes are protected
router.use(authController.protect);

router.get("/me", usercontroller.getMe);
router.patch("/updatePassword", authController.updateUserPassword);
router.patch("/updateMe", usercontroller.updateMe);
router.delete("/deleteMe", usercontroller.deleteMe);

// Routes with specific permissions
router.get("/allusers", authController.checkUserPermission('user:read_all'), usercontroller.getAllUsers);
router.get("/:id", authController.checkUserPermission('user:read_one'), usercontroller.getUserById);
router.patch("/updateUser/:id", authController.checkUserPermission('user:update_any'), usercontroller.updateUser);
router.delete("/deleteUser/:id", authController.checkUserPermission('user:delete_any'), usercontroller.deleteUser);

module.exports = router;

// // const fs = require('fs');
// const express = require("express");
// const router = express.Router();
// const app = express();
// const authController = require("../Controllers/authController");
// const usercontroller = require("../Controllers/usercontroller");
// app.use(express.json());

// router.post("/signup", authController.signup);
// router.post("/login", authController.login);
// router.post("/forgotPassword", authController.forgotPassword);
// router.patch("/resetPassword/:token", authController.resetPassword);

// router.use(authController.protect);
// // router.get("/me", usercontroller.getMe, usercontroller.getAllUsers);
// router.get("/me", usercontroller.getMe);
// router.get("/allusers", usercontroller.getAllUsers);
// router.patch("/updatePassword", authController.updateUserPassword);
// router.route("/updateMe").patch(usercontroller.updateMe);
// router.route("/deleteMe").delete(usercontroller.deleteMe);
// // do not update password with this
// router.route("/updateUser/:id").patch(authController.restrictTo("admin", "staff"), usercontroller.updateUser);
// router.route("/").get(usercontroller.getAllUsers);
// router.route("/:id").get(usercontroller.getUserById);
// router.route("/deleteUser/:id").delete(authController.restrictTo("admin"), usercontroller.deleteUser);

// module.exports = router;
