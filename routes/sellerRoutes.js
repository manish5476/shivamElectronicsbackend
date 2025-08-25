const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

// Import the factory and the Seller model
const factory = require('../Controllers/handleFactory');
const Seller = require('../Models/Seller'); // Make sure this path is correct
// --- Protect all routes ---
router.use(authController.protect);
// --- Restrict all routes to Admin/Staff ---
router.use(authController.restrictTo('admin', 'staff'));
// --- Unified Factory Routes ---
// GET all sellers AND POST (create) one or many sellers
router.route('/')
    .get(factory.getAll(Seller))
    .post(factory.create(Seller));

// GET one, UPDATE one, and DELETE one seller by ID
router.route('/:id')
    .get(factory.getOne(Seller))
    .patch(factory.update(Seller))
    .delete(factory.delete(Seller));
    
// --- Note on Bulk Updates/Deletes for this route file ---
// If you need bulk update/delete for sellers, you can add these routes:
// router.patch('/', factory.update(Seller));
// router.delete('/', factory.delete(Seller));
// I've used router.route() here for simplicity, which is ideal for ID-based operations.

module.exports = router;