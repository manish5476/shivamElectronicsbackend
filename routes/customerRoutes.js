const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const customerController = require("../Controllers/CustomerController");
const authController = require("../Controllers/authController");
const reviewRoutes = require("./reviewRoutes"); // Import reviewRoutes
// Product routes
router.route("/deletemany").delete(authController.protect, authController.restrictTo("admin", "staff"),customerController.deleteMultipleCustomer);
router.route("/").get(customerController.getAllCustomer).post(authController.protect,authController.restrictTo("admin", "staff"),customerController.findDuplicateCustomer,customerController.newCustomer);
router.route("/:id").get(customerController.getCustomerById).patch(authController.restrictTo("admin", "staff"),customerController.updateCustomer).delete(authController.protect,authController.restrictTo("admin"),customerController.deleteCustomer);
// router.route("/DropdownData").get(CustomerControl.getCustomerDropDownWithId);
router.use("/:CustomerId/reviews", reviewRoutes); 
module.exports = router;

// const express = require("express");
// const router = express.Router();
// const app = express();
// app.use(express.json());
// const productControl = require("../Controllers/productController");
// const customerController = require("../Controllers/CustomerController");

// const authController = require("../Controllers/authController");
// const reviewRoutes = require("./reviewRoutes"); // Import reviewRoutes

// // Product routes
// router
//     .route("/")
//     .get(customerController.getAllCustomer)
//     .post(
//         authController.protect,
//         authController.restrictTo("admin", "staff"),
//         customerController.findDuplicateCustomer,
//         customerController.newCustomer
//     );

// router
//     .route("/:id")
//     .get(customerController.getCustomerById)
//     .patch(authController.restrictTo("admin", "staff"),
//         customerController.updateCustomer)
//     .delete(
//         authController.protect,
//         authController.restrictTo("admin"),
//         customerController.deleteCustomer
//     );
// // router.route("/DropdownData").get(CustomerControl.getCustomerDropDownWithId);
// router.use("/:CustomerId/reviews", reviewRoutes); // <-- Important part
// module.exports = router;
