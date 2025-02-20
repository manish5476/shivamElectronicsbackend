// const crypto = require("crypto");
// const mongoose = require("mongoose");
// const validator = require("validator");
// const bcrypt = require("bcryptjs"); // For hashing passwords

// const userSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: [true, "Please provide your name"] },
//     email: {
//       type: String,
//       required: true,
//       unique: [true, "This email is already taken"],
//       lowercase: true,
//       validate: [validator.isEmail, "Please provide a valid email address"],
//     },
//     role: {
//       type: String,
//       enum: ["admin", "user", "staff"],
//       default: "user",
//     },
//     photo: { type: String }, // Fixed the typo, `String` instead of `string`
//     password: {
//       type: String,
//       required: [true, "Please provide a password"],
//       minlength: [8, "Password must be at least 8 characters long"],
//       select: false,
//     },
//     passwordConfirm: {
//       type: String,
//       required: [true, "Please confirm your password"],
//       validate: {
//         validator: function (value) {
//           return value === this.password; // Confirm password matches
//         },
//         message: "Passwords must match",
//       },
//     },
//     passwordChangedAt: { type: Date },
//     passwordResetToken: { type: String },
//     passwordResetExpires: { type: Date },
//     currentPassword: { type: String },
//     active: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next(); // Only hash if the password is modified
//   this.password = await bcrypt.hash(this.password, 12);
//   this.passwordConfirm = undefined;
//   next();
// });

// userSchema.pre("save", function (next) {
//   if (!this.isModified("password") || this.isNew) return next();
//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

// userSchema.methods.correctPassword = async function (candidatePassword, userpassword) {
//   return await bcrypt.compare(candidatePassword, userpassword); // "npm i bcrypt "
// };

// userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
//   // If there is a passwordChangedAt field, compare it to the JWT issue timestamp
//   if (this.passwordChangedAt) {
//     // Convert passwordChangedAt to a timestamp in seconds for comparison
//     const passwordChangedTimestamp = parseInt(
//       this.passwordChangedAt.getTime() / 1000,
//       10
//     );
//     // If the password was changed after the JWT was issued, return true
//     return passwordChangedTimestamp > JWTTimestamp;
//   } // If there's no password change, return false
//   return false;
// };

// userSchema.methods.createInstancePasswordToken = function () {
//   const resetToken = crypto.randomBytes(32).toString("hex");
//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   // console.log("resetToken", resetToken, this.passwordResetToken);

//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
//   // console.log("passwordResetToken", this.passwordResetExpires);
//   return resetToken;
// };

// // userSchema.pre('/^find/',function(next){
// //   this.find({active:{$ne:false}})
// //   next();
// // })

// userSchema.pre("find", function (next) {
//   this.find({ active: { $ne: false } }); // Filter out inactive users (active: false)
//   next();
// });

// userSchema.pre("findOne", function (next) {
//   this.findOne({ active: { $ne: false } }); // Filter out inactive user for findOne
//   next();
// });

// module.exports = mongoose.model("User", userSchema);
// // ?/
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true, select: false },
//   role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
//   passwordChangedAt: { type: Date },
//   passwordResetToken: { type: String },
//   passwordResetExpires: { type: Date },
//   // twoFactorSecret: { type: String }, // Uncomment for 2FA
// });

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

// userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
//     return JWTTimestamp < changedTimestamp;
//   }
//   return false;
// };

// module.exports = mongoose.model('User', userSchema);
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
      enum: ["user", "staff", "admin"],
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
  },
  { timestamps: true }
);

// Pre-save hooks
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } }).select("-__v");
  next();
});

// Instance methods
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