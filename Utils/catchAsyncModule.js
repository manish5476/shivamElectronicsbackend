// const catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//   };
// };
// module.exports = catchAsync;
/**
 * Wraps an async route handler to catch and forward errors to the next middleware.
 * @param {Function} fn - The async route handler function.
 * @returns {Function} - The wrapped middleware function.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    if (typeof fn !== 'function') {
      throw new Error('Handler must be a function');
    }
    const result = fn(req, res, next);
    if (result instanceof Promise) {
      result.catch(next);
    }
    return result;
  };
};

module.exports = catchAsync;