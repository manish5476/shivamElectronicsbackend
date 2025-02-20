const express = require('express');
const router = express.Router();
const productControl = require('../Controllers/productController');
const authController = require('../Controllers/authController');
const reviewRoutes = require('./reviewRoutes');

// Protected routes (require authentication)
router.use(authController.protect);

// User-accessible routes
router.get('/', productControl.getAllProduct); // Users can view all products
router.get('/:id', productControl.getProductById); // Users can view a specific product
router.get('/DropdownData', productControl.getProductDropdownWithId); // Users can get dropdown data

// Admin/staff-only routes
router.post('/', authController.restrictTo('admin', 'staff'), productControl.findDuplicateProduct, productControl.newProduct); // Create product
router.patch('/:id', authController.restrictTo('admin', 'staff'), productControl.updateProduct); // Update product
router.delete('/:id', authController.restrictTo('admin', 'staff'), productControl.deleteProduct); // Delete product
// router.delete('/deletemany', authController.restrictTo('admin', 'staff'), productControl.deleteMultipleProduct); // Delete multiple products

// Nested review routes (user can create reviews, controlled by reviewRoutes)
router.use('/:productId/reviews', reviewRoutes);

module.exports = router;