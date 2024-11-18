// const mongoose = require("mongoose");
// const validator=require('validator')
// const userSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: [true,'your name please'] },
//     email: { type: String, required: true, unique: [true,'one google emai required'] ,lowercase:true,validate:[validator.isEmail,"please provide a valid email"]},
//     photo:{type:String},
//     password: { type: String, required: [true,'please provide a good password'],minlength:8 },
//     passwordConfirm: { type: String, required: [true,'password must be same please Confirm'] },
//     // isAdmin: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// module.exports= mongoose.model("User", userSchema);
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs"); // For hashing passwords

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please provide your name'] },
    email: { 
      type: String, 
      required: true, 
      unique: [true, 'This email is already taken'], 
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email address'] 
    },
    photo: { type: String }, // Fixed the typo, `String` instead of `string`
    password: { 
      type: String, 
      required: [true, 'Please provide a password'], 
      minlength: [8, 'Password must be at least 8 characters long'] 
    },
    passwordConfirm: { 
      type: String, 
      required: [true, 'Please confirm your password'], 
      validate: {
        validator: function(value) {
          return value === this.password; // Confirm password matches
        },
        message: 'Passwords must match'
      }
    },
  },
  { timestamps: true }
);

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash if the password is modified
  this.password = await bcrypt.hash(this.password, 12); // Hash password
  this.passwordConfirm = undefined; // Remove passwordConfirm from the schema after hashing
  next();
});

module.exports = mongoose.model("User", userSchema);
