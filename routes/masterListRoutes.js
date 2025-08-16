const express = require('express');
const router = express.Router();
const masterListController = require('../Controllers/masterListController');
const authController = require('../Controllers/authController');

// Protect all routes
router.use(authController.protect);
router.get('/:module', masterListController.getModuleMasterList);
router.get('/search', masterListController.searchMasterList);


module.exports = router; 