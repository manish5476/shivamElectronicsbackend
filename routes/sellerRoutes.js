const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const sellerController = require('../Controllers/sellerController');

// Protected routes (require authentication)
router.use(authController.protect);

// Admin/staff-only routes
router.get('/', authController.restrictTo('admin', 'staff'), sellerController.getAllSeller);
router.post('/', authController.restrictTo('admin', 'staff'), sellerController.newSeller);
router.get('/:id', authController.restrictTo('admin', 'staff'), sellerController.getSellerById);
router.patch('/:id', authController.restrictTo('admin', 'staff'), sellerController.updateSeller);
router.delete('/:id', authController.restrictTo('admin', 'staff'), sellerController.deleteSeller);

module.exports = router;