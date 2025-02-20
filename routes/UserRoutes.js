// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
const authController = require("../Controllers/authController");
const usercontroller = require("../Controllers/usercontroller");
app.use(express.json());

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);
// router.get("/me", usercontroller.getMe, usercontroller.getAllUsers);
router.get("/me", usercontroller.getMe);
router.get("/allusers", usercontroller.getAllUsers);
router.patch("/updatePassword", authController.updateUserPassword);
router.route("/updateMe").patch(usercontroller.updateMe);
router.route("/deleteMe").delete(usercontroller.deleteMe);

// do not update password with this
router.route("/updateUser/:id").patch(authController.restrictTo("admin", "staff"), usercontroller.updateUser);
router.route("/").get(usercontroller.getAllUsers);
router.route("/:id").get(usercontroller.getUserById);
router.route("/deleteUser/:id").delete(authController.restrictTo("admin"), usercontroller.deleteUser);

module.exports = router;

/**const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const userController = require('../Controllers/usercontroller');

// Public routes (no authentication)
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/me', userController.getMe); // User can view their own profile
router.patch('/updatePassword', authController.updateUserPassword); // User can update their password
router.patch('/updateMe', userController.updateMe); // User can update their profile
router.delete('/deleteMe', userController.deleteMe); // User can deactivate their account

// Admin/staff-only routes
router.get('/allusers', authController.restrictTo('admin', 'staff'), userController.getAllUsers); // View all users
router.patch('/updateUser/:id', authController.restrictTo('admin', 'staff'), userController.updateUser); // Update any user
router.get('/:id', authController.restrictTo('admin', 'staff'), userController.getAllUsersById); // View any user by ID
router.delete('/deleteUser/:id', authController.restrictTo('admin'), userController.deleteUser); // Delete any user

module.exports = router; */