// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const productControl = require("./../Controllers/productController");
const authController = require("./../Controllers/authController");
const reviewController = require("../Controllers/reviewController")
router
  .route("/")
  .get(authController.protect, productControl.getAllProduct)
  .post(productControl.newProduct);
router
  .route("/:id")
  // .get(productControl.GetAllProductsById)
  .get(authController.protect, productControl.getProductById)
  .patch(productControl.updateProduct)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    productControl.deleteProduct
  );

router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// 
//reiew
router.route("/:tourId/reviews").post(authController.protect,authController.restrictTo('user'),reviewController.createReview)
// too heavy  watch  this route
module.exports = router;
