const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const authController = require("./../Controllers/authController");
const sellerController = require("../Controllers/sellerController")
// Seller routes
router.route("/").get(authController.protect,authController.restrictTo("admin", "staff"),sellerController.getAllSeller).post( sellerController.newSeller);
router.route("/:id").get(sellerController.getSellerById).patch(sellerController.updateSeller).delete(authController.restrictTo("admin", "staff"),sellerController.deleteSeller);
// router.route("/DropdownData").get(authController.restrictTo("admin", "staff"),sellerController.getSellerDropDownWithId);
module.exports = router;




// const express = require('express');
// const router = express.Router();

// const authController = require('../Controllers/authController');
// const sellerController = require('../Controllers/sellerController');

// // Seller routes
// router
//   .route('/sellers') // Define the base URL for seller routes
//   .get(
//     authController.protect, 
//     authController.restrictTo('admin', 'staff'), 
//     sellerController.getAllSellers 
//   )
//   .post(sellerController.createSeller); // Use more descriptive method names

// router
//   .route('/sellers/within/:distance/center/:latlng/unit/:unit')
//   .get(sellerController.getSellersWithin);

// router
//   .route('/sellers/:id')
//   .get(sellerController.getSeller) 
//   .patch(sellerController.updateSeller)
//   .delete(
//     authController.protect, 
//     authController.restrictTo('admin', 'staff'), 
//     sellerController.deleteSeller
//   );

// module.exports = router;

// const Seller = require('../Models/Seller');
// const handleFactory = require('../Controllers/handleFactory');

// exports.getAllSellers = handleFactory.getAll(Seller); // Plural for consistency
// exports.getSeller = handleFactory.getOne(Seller); // More descriptive name
// exports.createSeller = handleFactory.createOne(Seller); // Use createOne for consistency
// exports.deleteSeller = handleFactory.deleteOne(Seller);
// exports.updateSeller = handleFactory.updateOne(Seller);