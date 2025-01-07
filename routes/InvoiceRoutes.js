// const express = require("express");
// const router = express.Router();
// const app = express();
// app.use(express.json());
// const productControl = require("../Controllers/productController");
// const invoiceController = require("../Controllers/InvoiceController")
// const authController = require("../Controllers/authController");
// const reviewRoutes = require("./reviewRoutes"); // Import reviewRoutes

// // Product routes
// router
//     .route("/")
//     .get(invoiceController.getAllInvoice)
//     .post(
//         authController.protect,
//         authController.restrictTo("admin", "staff"),
//         invoiceController.findDuplicateInvoice,
//         invoiceController.newInvoice
//     );

// router
//     .route("/:id")
//     .get(invoiceController.getInvoiceById)
//     .patch(authController.restrictTo("admin", "staff"),
//         invoiceController.updateInvoice)
//     .delete(
//         authController.protect,
//         authController.restrictTo("admin"),
//         invoiceController.deleteInvoice
//     );
// // router.route("/DropdownData").get(InvoiceControl.getInvoiceDropDownWithId);
// router.use("/:InvoiceId/reviews", reviewRoutes); // <-- Important part
// module.exports = router;
