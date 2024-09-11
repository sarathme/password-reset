// Global error handling middleware for entire express app.

module.exports = (err, req, res, next) => {
  if (!err.isOperational) {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
      stack: err.stack,
    });
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
