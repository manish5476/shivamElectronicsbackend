const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    role: {
      type: String,
      enum: ["user", "staff", "admin", "superAdmin"],
      default: "user",
    },
    photo: String,
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: "Passwords must match",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    // --- THIS IS THE NEW FIELD ---
    allowedRoutes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// --- ALL YOUR EXISTING HOOKS AND METHODS REMAIN THE SAME ---
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } }).select("-__v");
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  return this.passwordChangedAt
    ? parseInt(this.passwordChangedAt.getTime() / 1000, 10) > JWTTimestamp
    : false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);


// const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Name is required"],
//     },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       lowercase: true,
//       validate: [validator.isEmail, "Please provide a valid email"],
//     },
//     role: {
//       type: String,
//       enum: ["user", "staff", "admin", "superAdmin"],
//       default: "user",
//     },
//     photo: String,
//     password: {
//       type: String,
//       required: [true, "Password is required"],
//       minlength: [8, "Password must be at least 8 characters"],
//       select: false,
//     },
//     passwordConfirm: {
//       type: String,
//       required: [true, "Please confirm your password"],
//       validate: {
//         validator: function (val) {
//           return val === this.password;
//         },
//         message: "Passwords must match",
//       },
//     },
//     allowedRoutes: {
//       type: [String],
//       default: []
//     },
//     passwordChangedAt: Date,
//     passwordResetToken: String,
//     passwordResetExpires: Date,
//     active: {
//       type: Boolean,
//       default: true,
//       select: false,
//     },
//   },
//   { timestamps: true }
// );

// // Pre-save hooks
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   this.passwordConfirm = undefined;
//   if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

// // Query middleware
// userSchema.pre(/^find/, function (next) {
//   this.find({ active: { $ne: false } }).select("-__v");
//   next();
// });

// // Instance methods
// userSchema.methods.correctPassword = async function (candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
//   return this.passwordChangedAt
//     ? parseInt(this.passwordChangedAt.getTime() / 1000, 10) > JWTTimestamp
//     : false;
// };

// userSchema.methods.createPasswordResetToken = function () {
//   const resetToken = crypto.randomBytes(32).toString("hex");
//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");
//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
//   return resetToken;
// };

// module.exports = mongoose.model("User", userSchema);