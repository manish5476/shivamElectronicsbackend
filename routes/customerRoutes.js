const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const customerController = require('../Controllers/CustomerController');

// Import the factory and the Customer model
const factory = require('../Controllers/handleFactory');
const Customer = require('../Models/customerModel'); // Make sure this path is correct

// --- All routes are protected from this point ---
router.use(authController.protect);

// --- User-accessible route ---
// This allows a logged-in user to see their own details.
// Note: This assumes custom logic in getCustomerById to match the logged-in user.
// If you want any user to get any customer by ID, move this to the admin section.
router.get('/:id', customerController.getCustomerById);

// --- Admin/Staff Restricted Routes ---
router.use(authController.restrictTo('admin', 'staff'));

// GET all customers
router.get('/', factory.getAll(Customer));

// POST to / -> Creates one or many customers
// The findDuplicateCustomer middleware will run before the factory function.
router.post('/', customerController.findDuplicateCustomer, factory.create(Customer));

// PATCH to /:id -> Updates one customer
// PATCH to / -> Updates many customers (from body)
router.patch('/:id?', factory.update(Customer));

// DELETE to /:id -> Deletes one customer
// DELETE to / -> Deletes many customers (from body)
router.delete('/:id?', factory.delete(Customer));

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const customerController = require('../Controllers/CustomerController');

// // Protected routes (require authentication)
// router.use(authController.protect);

// // User-accessible routes
// router.get('/:id', customerController.getCustomerById); // Users can view their own profile (assumes ID matches authenticated user)

// // Admin/staff-only routes
// router.get('/', authController.restrictTo('admin', 'staff'), customerController.getAllCustomer); // View all customers
// router.post('/', authController.restrictTo('admin', 'staff'), customerController.findDuplicateCustomer, customerController.newCustomer); // Create customer
// router.patch('/:id', authController.restrictTo('admin', 'staff'), customerController.updateCustomer); // Update customer
// router.delete('/:id', authController.restrictTo('admin', 'staff'), customerController.deleteCustomer); // Delete customer
// // router.delete('/deletemany', authController.restrictTo('admin', 'staff'), customerController.deleteMultipleCustomer); // Delete multiple customers
// // authController.restrictTo('admin', 'staff'),
// // router.get('/customerDropDown', customerController.getCustomerDropdown); // Dropdown for admins

// module.exports = router;