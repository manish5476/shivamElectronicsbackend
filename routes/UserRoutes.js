// const fs = require('fs');
const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());
const User = require("../Controllers/userController");

router.post('/signup',User.signup)

// router
//   .route("/")
//   .get(User.getAllUser)
//   // .post(User.newUser);
// router
//   .route("/:id")
//   // .get(User.GetAllProductsById)
//   .get(User.getUser)
//   .patch(User.updateUser)
//   .delete(User.delelteUser);

// router.route("/DropdownData").get(User.getProductDropDownWithId);

// too heavy  watch  this route
module.exports = router;

// const express = require("express");
// const router = express.Router();
// const User = require("../Controllers/userController"); // Import controller

// // POST /signup
// router.post('/signup', User.signup);

// // GET /users - Get all users (you need to define `getAllUser` function in controller)
// router.get("/", User.getAllUser);

// // POST /users - Create a new user (can be a separate controller method if needed)
// router.post("/", User.newUser);

// // GET /users/:id - Get a specific user by ID
// router.get("/:id", User.getUser);

// // PATCH /users/:id - Update a user by ID
// router.patch("/:id", User.updateUser);

// // DELETE /users/:id - Delete a user by ID
// router.delete("/:id", User.deleteUser);

// // GET /DropdownData - Some other endpoint (you need to define `getProductDropDownWithId` in controller)
// router.get("/DropdownData", User.getProductDropDownWithId);

// module.exports = router;
