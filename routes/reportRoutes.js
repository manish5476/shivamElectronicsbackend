const express = require("express");
const router = express.Router();
const reportController = require("../Controllers/reportController");
const authController = require("../Controllers/authController");

router.use(authController.protect);
router.use(authController.restrictTo("admin", "superAdmin"));

router
    .route("/")
    .post(
        authController.checkUserPermission("report:subscribe"),
        reportController.subscribeToReport,
    )
    .get(
        authController.checkUserPermission("report:read_all"),
        reportController.getMySubscriptions,
    );

router
    .route("/:id")
    .delete(
        authController.checkUserPermission("report:unsubscribe"),
        reportController.unsubscribeFromReport,
    );

module.exports = router;
