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
    passwordChangedAt: { Date },
  },
  { timestamps: true }
);

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Only hash if the password is modified
  this.password = await bcrypt.hash(this.password, 12); // Hash password  // " npm i bcrypt "
  this.passwordConfirm = undefined; // Remove passwordConfirm from the schema after hashing
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userpassword
) {
  return await bcrypt.compare(candidatePassword, userpassword); // "npm i bcrypt "
};

userSchema.methods.changePasswordAfter = async function (JWTTimestamp) {
  // if (this.isModified("password")) return await false;
  console.log(this);
  if (this.passwordChangedAt) {
    console.log("password Changed", this.passwordChangedAt, "at", JWTTimestamp);
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);
