const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const productControl = require("./../Controllers/productController");
const authController = require("./../Controllers/authController");
const reviewRoutes = require("../routes/reviewRoutes"); // Import reviewRoutes

// Product routes
router
  .route("/")
  .get(productControl.getAllProduct)
  .post(
    authController.protect,
    authController.restrictTo("admin", "staff"),
    productControl.findDuplicateProduct,
    productControl.newProduct
  );

router
  .route("/product-within/:distance/center/:latlng/unit/:unit")
  .get(productControl.getProductWithIn);

router
  .route("/:id")
  .get(productControl.getProductById)
  .patch(
    authController.restrictTo("admin", "staff"),
    productControl.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    productControl.deleteProduct
  );
router.route("/DropdownData").get(productControl.getProductDropDownWithId);
router.use("/:productId/reviews", reviewRoutes); // <-- Important part
module.exports = router;

// // const fs = require('fs');
// const express = require("express");
// const router = express.Router();
// const app = express();
// app.use(express.json());
// const productControl = require("./../Controllers/productController");
// const authController = require("./../Controllers/authController");
// const reviewRoutes= require('../routes/reviewRoutes')
// // const reviewController = require("../Controllers/reviewController")
// router
//   .route("/")
//   .get(authController.protect, productControl.getAllProduct)
//   .post(productControl.newProduct);
// router
//   .route("/:id")
//   // .get(productControl.GetAllProductsById)
//   .get(authController.protect, productControl.getProductById)
//   .patch(productControl.updateProduct)
//   .delete(
//     authController.protect,
//     authController.restrictTo("admin"),
//     productControl.deleteProduct
//   );

// router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// router.use('/:productId/reviews',reviewRoutes)
// //reiew route it belong ro review routes
// // router.route("/:tourId/reviews").post(authController.protect,authController.restrictTo('user'),reviewController.createReview)
// // too heavy  watch  this route
// module.exports = router;
