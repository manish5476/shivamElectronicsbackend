const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const productControl = require("./../Controllers/productController");
const authController = require("./../Controllers/authController");
const reviewRoutes = require("../routes/reviewRoutes"); // Import reviewRoutes
const MasterController = require("../Controllers/MasterliastController");

router.route("/autopopulate").get(MasterController.getMasterList);
router.route("/deletemany").delete(authController.protect, authController.restrictTo("admin", "staff"),productControl.deleteMultipleProduct);

// Product routes
router.route("/").get(authController.protect,authController.restrictTo("admin", "staff"),productControl.getAllProduct).post( productControl.newProduct);
// router.route("/").get(productControl.getAllProduct).post(authController.protect,authController.restrictTo("admin", "staff"), productControl.findDuplicateProduct,  productControl.newProduct);

router.route("/MasterController").get(productControl.getProductDropDownWithId);
router.route("/product-within/:distance/center/:latlng/unit/:unit").get(productControl.getProductWithIn);
router.route("/:id").get(productControl.getProductById).patch(productControl.updateProduct).delete(authController.restrictTo("admin", "staff"),productControl.deleteProduct);
// router.route("/:id").get(productControl.getProductById).patch( authController.restrictTo("admin", "staff"), productControl.updateProduct).delete( authController.protect, authController.restrictTo("admin"), productControl.deleteProduct);
// router.route("/:id").get(productControl.getProductById).patch( authController.restrictTo("admin", "staff"), productControl.updateProduct).delete( authController.protect, authController.restrictTo("admin"), productControl.deleteMultipleProduct);
router.route("/DropdownData").get(authController.restrictTo("admin", "staff"),productControl.getProductDropDownWithId);
router.use("/:productId/reviews", reviewRoutes); 
// <-- Important part
module.exports = router;

// // // const fs = require('fs');
// // const express = require("express");
// // const router = express.Router();
// // const app = express();
// // app.use(express.json());
// // const productControl = require("./../Controllers/productController");
// // const authController = require("./../Controllers/authController");
// // const reviewRoutes= require('../routes/reviewRoutes')
// // // const reviewController = require("../Controllers/reviewController")
// // router
// //   .route("/")
// //   .get(authController.protect, productControl.getAllProduct)
// //   .post(productControl.newProduct);
// // router
// //   .route("/:id")
// //   // .get(productControl.GetAllProductsById)
// //   .get(authController.protect, productControl.getProductById)
// //   .patch(productControl.updateProduct)
// //   .delete(
// //     authController.protect,
// //     authController.restrictTo("admin"),
// //     productControl.deleteProduct
// //   );

// // router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// // router.use('/:productId/reviews',reviewRoutes)
// // //reiew route it belong ro review routes
// // // router.route("/:tourId/reviews").post(authController.protect,authController.restrictTo('user'),reviewController.createReview)
// // // too heavy  watch  this route
// // module.exports = router;
// const express = require("express");
// const router = express.Router();
// const app = express();
// app.use(express.json());
// const productControl = require("./../Controllers/productController");
// const authController = require("./../Controllers/authController");
// const reviewRoutes = require("../routes/reviewRoutes"); // Import reviewRoutes
// const MasterController = require("../Controllers/MasterliastController");
// const handleFactory = require("./../Controllers/handleFactory");
// const Product =require("./../Models/productModel")
// // const reviewController = require("../Controllers/reviewController")
// // Product routes
// router.route("/").get(productControl.getAllProduct)
//   .post(authController.protect,
//     // authController.restrictTo("admin", "staff"),
//     productControl.findDuplicateProduct,
//     productControl.newProduct
//   );
//   router.get('/productstitle', handleFactory.createList(Product, ['title', 'sku', '_id']));

// // router.route("/productList").get(MasterController.productMasterList);
// router.route("/product-within/:distance/center/:latlng/unit/:unit").get(productControl.getProductWithIn);
// router.route("/:id").get(productControl.getProductById) .patch( authController.restrictTo("admin", "staff"), productControl.updateProduct).delete( authController.protect, authController.restrictTo("admin"), productControl.deleteProduct);
// router.route("/DropdownData").get(productControl.getProductDropDownWithId);
// router.use("/:productId/reviews", reviewRoutes); // <-- Important part
// module.exports = router;



// // // const fs = require('fs');
// // const express = require("express");
// // const router = express.Router();
// // const app = express();
// // app.use(express.json());
// // const productControl = require("./../Controllers/productController");
// // const authController = require("./../Controllers/authController");
// // const reviewRoutes= require('../routes/reviewRoutes')
// // // const reviewController = require("../Controllers/reviewController")
// // router
// //   .route("/")
// //   .get(authController.protect, productControl.getAllProduct)
// //   .post(productControl.newProduct);
// // router
// //   .route("/:id")
// //   // .get(productControl.GetAllProductsById)
// //   .get(authController.protect, productControl.getProductById)
// //   .patch(productControl.updateProduct)
// //   .delete(
// //     authController.protect,
// //     authController.restrictTo("admin"),
// //     productControl.deleteProduct
// //   );

// // router.route("/DropdownData").get(productControl.getProductDropDownWithId);

// // router.use('/:productId/reviews',reviewRoutes)
// // //reiew route it belong ro review routes
// // // router.route("/:tourId/reviews").post(authController.protect,authController.restrictTo('user'),reviewController.createReview)
// // // too heavy  watch  this route
// // module.exports = router;
