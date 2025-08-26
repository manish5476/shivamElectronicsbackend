const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const reviewRoutes = require('./reviewRoutes');
const factory = require('../Controllers/handleFactory');
const Product = require('../Models/productModel');
const productControl = require('../Controllers/productController');
const getMasterList = require('../Controllers/MasterliastController');

// --- Unprotected Routes ---
router.get('/DropdownData', productControl.getProductDropdownWithId);
router.get('/autopopulate', getMasterList.getMasterList);

// --- All subsequent routes are protected ---
router.use(authController.protect);

// --- Routes with specific permissions ---
router.get('/', authController.checkUserPermission('product:read_all'), factory.getAll(Product));
router.post('/', authController.checkUserPermission('product:create'), factory.create(Product));
router.get('/:id', authController.checkUserPermission('product:read_one'), factory.getOne(Product));
router.patch('/:id?', authController.checkUserPermission('product:update'), factory.update(Product));
router.delete('/:id?', authController.checkUserPermission('product:delete'), factory.delete(Product));

// Nested review routes
router.use('/:productId/reviews', reviewRoutes);

module.exports = router;
// const express = require('express');
// const router = express.Router();
// const authController = require('../Controllers/authController');
// const reviewRoutes = require('./reviewRoutes');

// // Import the factory and the Product model
// const factory = require('../Controllers/handleFactory');
// const Product = require('../Models/productModel'); // Ensure this path is correct

// // --- Unprotected Routes ---
// // These routes don't require a user to be logged in.
// // Note: I'm assuming these have custom logic not covered by the factory.
// // If they can be converted to factory.getAll(Product), you can do that.
// const productControl = require('../Controllers/productController');
// const getMasterList = require('../Controllers/MasterliastController');
// router.get('/DropdownData', productControl.getProductDropdownWithId);
// router.get('/autopopulate', getMasterList.getMasterList);

// // --- All subsequent routes are protected ---
// router.use(authController.protect);

// // --- Combined Routes using the Factory ---

// // GET all products OR GET a single product by ID
// router.get('/', factory.getAll(Product));
// router.get('/:id', factory.getOne(Product));

// // --- Admin/Staff Restricted Routes ---
// router.use(authController.restrictTo('superAdmin','admin', 'staff'));

// // POST to / -> Creates one or many products
// router.post('/', factory.create(Product));

// // PATCH to /:id -> Updates one product
// // PATCH to / -> Updates many products (from body)
// router.patch('/:id?', factory.update(Product));

// // DELETE to /:id -> Deletes one product
// // DELETE to / -> Deletes many products (from body)
// router.delete('/:id?', factory.delete(Product));

// // --- Nested Routes ---
// // This remains the same. It correctly forwards to your review router.
// router.use('/:productId/reviews', reviewRoutes);

// module.exports = router;
