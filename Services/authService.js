const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../Models/UserModel');
const AppError = require('../Utils/appError');
const logger = require('../Utils/logger'); // Assuming a central logger utility

/**
 * Signs a JWT token for a given user ID.
 */
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

/**
 * Creates a new user. Shared logic for API and Bot.
 */
exports.signupUser = async ({ name, email, password, passwordConfirm, role }) => {
    if (password !== passwordConfirm) {
        throw new AppError('Passwords do not match', 400);
    }

    const newUser = await User.create({ name, email, password, passwordConfirm, role: role || 'user' });
    logger.info(`User Signed Up: UserID: ${newUser._id}, Email: ${newUser.email}`);
    
    const token = signToken(newUser._id);
    newUser.password = undefined; // Remove password from output
    return { user: newUser, token };
};

/**
 * Logs in a user. Shared logic for API and Bot.
 */
exports.loginUser = async (email, password) => {
    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password))) {
        logger.warn(`Failed Login Attempt: Email: ${email}`);
        throw new AppError('Invalid email or password', 401);
    }

    logger.info(`User Logged In: UserID: ${user._id}, Email: ${user.email}`);
    const token = signToken(user._id);
    user.password = undefined;
    return { user, token };
};

/**
 * Verifies a JWT and returns the user.
 */
exports.verifyTokenAndGetUser = async (tokenHeader) => {
    if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
        throw new AppError('Authorization header missing or malformed.', 401);
    }
    const token = tokenHeader.split(' ')[1];

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
        throw new AppError('User recently changed password! Please log in again.', 401);
    }

    return currentUser;
};