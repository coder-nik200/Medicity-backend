// Global Error Handler Middleware
// Standardizes error responses across the application

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Something went wrong";

  // Wrong MongoDB ID error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new AppError(message, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate field value entered: ${Object.keys(err.keyValue)[0]}`;
    err = new AppError(message, 400);
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `JSON Web Token is invalid, try again`;
    err = new AppError(message, 401);
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    const message = `JSON Web Token is expired, try again`;
    err = new AppError(message, 401);
  }

  // Validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((v) => v.message)
      .join(", ");
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    statusCode: err.statusCode,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Async handler to catch errors in async routes
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error formatter
export const formatValidationErrors = (errors) => {
  return errors.reduce((acc, error) => {
    acc[error.path] = error.message;
    return acc;
  }, {});
};

export default { errorHandler, asyncHandler, AppError };
