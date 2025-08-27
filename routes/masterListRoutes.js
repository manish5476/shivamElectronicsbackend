const express = require('express');
const router = express.Router();
const masterListController = require('../Controllers/masterListController');
const authController = require('../Controllers/authController');

router.use(authController.protect);
router.get('/:module', authController.checkUserPermission('masterlist:read_module'), masterListController.getModuleMasterList);
router.get('/search', authController.checkUserPermission('masterlist:search'), masterListController.searchMasterList);

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const masterListController = require('../Controllers/masterListController');
// const authController = require('../Controllers/authController');

// // Protect all routes
// router.use(authController.protect);
// router.get('/:module', masterListController.getModuleMasterList);
// router.get('/search', masterListController.searchMasterList);


// module.exports = router; 