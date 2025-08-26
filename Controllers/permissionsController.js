const User = require('../Models/UserModel');
const PERMISSIONS = require('../config/permissions');

exports.getAllPermissions = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: PERMISSIONS
  });
};

exports.getUsersWithPermissions = async (req, res) => {
  const users = await User.find().select('name email role allowedRoutes');
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: users
  });
};

exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { allowedRoutes } = req.body;
    if (!Array.isArray(allowedRoutes)) {
      return res.status(400).json({ status: 'fail', message: 'allowedRoutes must be an array.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { allowedRoutes },
      { new: true, runValidators: true }
    ).select('name email role allowedRoutes');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'No user found with that ID' });
    }

    res.status(200).json({ status: 'success', data: user });
  } catch (err) {
    next(err); // let global error handler catch it
  }
};


// exports.updateUserPermissions = async (req, res) => {
//   const { allowedRoutes } = req.body;

//   if (!Array.isArray(allowedRoutes)) {
//     return res.status(400).json({ status: 'fail', message: 'allowedRoutes must be an array.' });
//   }

//   const user = await User.findByIdAndUpdate(
//     req.params.userId,
//     { allowedRoutes },
//     { new: true, runValidators: true }
//   ).select('name email role allowedRoutes');

//   if (!user) {
//     return res.status(404).json({ status: 'fail', message: 'No user found with that ID' });
//   }

//   res.status(200).json({
//     status: 'success',
//     data: user
//   });
// };