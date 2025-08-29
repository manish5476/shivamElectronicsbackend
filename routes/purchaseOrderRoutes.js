const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../Controllers/purchaseOrderController");
const authController = require("../Controllers/authController");

router.use(authController.protect);

router.route("/").post( authController.checkUserPermission("purchaseorder:create"), purchaseOrderController.createPurchaseOrder,)
                 .get( authController.checkUserPermission("purchaseorder:read_all"), purchaseOrderController.getAllPurchaseOrders,);
router.route("/:id").get( authController.checkUserPermission("purchaseorder:read_one"), purchaseOrderController.getPurchaseOrder,);
router.patch("/:purchaseOrderId/receive-stock",authController.checkUserPermission("purchaseorder:update_status"),purchaseOrderController.receiveStock,
);

module.exports = router;
