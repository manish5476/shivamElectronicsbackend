const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const customerController = require('../Controllers/CustomerController');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/:id', customerController.getCustomerById); // Users can view their own profile (assumes ID matches authenticated user)

// Admin/staff-only routes
router.get('/', authController.restrictTo('admin', 'staff'), customerController.getAllCustomer); // View all customers
router.post('/', authController.restrictTo('admin', 'staff'), customerController.findDuplicateCustomer, customerController.newCustomer); // Create customer
router.patch('/:id', authController.restrictTo('admin', 'staff'), customerController.updateCustomer); // Update customer
router.delete('/:id', authController.restrictTo('admin', 'staff'), customerController.deleteCustomer); // Delete customer
// router.delete('/deletemany', authController.restrictTo('admin', 'staff'), customerController.deleteMultipleCustomer); // Delete multiple customers
// authController.restrictTo('admin', 'staff'),
// router.get('/customerDropDown', customerController.getCustomerDropdown); // Dropdown for admins

module.exports = router;