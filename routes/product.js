// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const productControl = require("./../Controllers/productController");
router
  .route("/")
  .get(productControl.getAllProduct)
  .post(productControl.newProduct);
router
  .route("/:id")
  // .get(productControl.GetAllProductsById)
  .get(productControl.getProductById)
  .patch(productControl.updateProduct)
  .delete(productControl.deleteProduct);

router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// too heavy  watch  this route
module.exports = router;
