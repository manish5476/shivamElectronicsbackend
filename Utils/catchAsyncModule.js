const catchAsync = (fn) => {
  return (req, res, next) => {
    if (typeof fn !== "function") {
      throw new Error("Handler must be a function");
    }
    const result = fn(req, res, next);
    if (result instanceof Promise) {
      result.catch(next);
    }
    return result;
  };
};

module.exports = catchAsync;
