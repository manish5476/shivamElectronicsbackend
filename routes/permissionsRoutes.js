const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const permissionsController = require('../Controllers/permissionsController');

// All these routes are for the Super Admin UI ONLY.
router.use(authController.protect, authController.restrictTo('superAdmin'));

router.get('/all', permissionsController.getAllPermissions);
router.get('/users', permissionsController.getUsersWithPermissions);
router.put('/users/:userId', permissionsController.updateUserPermissions);

module.exports = router;
