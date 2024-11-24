// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const productControl = require("./../Controllers/productController");
const userController = require("./../Controllers/userController");

router
  .route("/")
  .get(userController.protect, productControl.getAllProduct)
  .post(productControl.newProduct);
router
  .route("/:id")
  // .get(productControl.GetAllProductsById)
  .get(userController.protect,productControl.getProductById)
  .patch(productControl.updateProduct)
  .delete(userController.protect,userController.restrictTo('admin'),productControl.deleteProduct);

router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// too heavy  watch  this route
module.exports = router;
