// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const User = require("../Controllers/userController");

router.post("/signup", User.signup);
router.post("/login", User.login);

module.exports = router;

// .post(User.newUser);
// router
//   .route("/:id")
//   // .get(User.GetAllProductsById)
//   .get(User.getUser)
//   .patch(User.updateUser)
//   .delete(User.delelteUser);

// router.route("/DropdownData").get(User.getProductDropDownWithId);

// too heavy  watch  this route
// router.route("/").get(User.getAllUsers).
