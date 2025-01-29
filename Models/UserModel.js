const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs"); // For hashing passwords

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Please provide your name"] },
    email: {
      type: String,
      required: true,
      unique: [true, "This email is already taken"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    role: {
      type: String,
      enum: ["admin", "user", "staff"],
      default: "user",
    },
    photo: { type: String }, // Fixed the typo, `String` instead of `string`
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (value) {
          return value === this.password; // Confirm password matches
        },
        message: "Passwords must match",
      },
    },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    currentPassword: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Only hash if the password is modified
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; 
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function ( candidatePassword, userpassword) {
  return await bcrypt.compare(candidatePassword, userpassword); // "npm i bcrypt "
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  // If there is a passwordChangedAt field, compare it to the JWT issue timestamp
  if (this.passwordChangedAt) {
    // Convert passwordChangedAt to a timestamp in seconds for comparison
    const passwordChangedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // If the password was changed after the JWT was issued, return true
    return passwordChangedTimestamp > JWTTimestamp;
  } // If there's no password change, return false
  return false;
};

userSchema.methods.createInstancePasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log("resetToken", resetToken, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // console.log("passwordResetToken", this.passwordResetExpires);
  return resetToken;
};

// userSchema.pre('/^find/',function(next){
//   this.find({active:{$ne:false}})
//   next();
// })

userSchema.pre("find", function (next) {
  this.find({ active: { $ne: false } }); // Filter out inactive users (active: false)
  next();
});

userSchema.pre("findOne", function (next) {
  this.findOne({ active: { $ne: false } }); // Filter out inactive user for findOne
  next();
});

module.exports = mongoose.model("User", userSchema);
