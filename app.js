const express = require("express");

const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const userRouter = require("./routes/userRoutes");

const app = express();

// Middleware to attach body to request object and parse JSON.
app.use(express.json());

// ROUTES

app.use("/api/v1/users", userRouter);

app.use("*", (req, res, next) => {
  next(new AppError("This route is not defined", 404));
});

app.use(globalErrorHandler);
module.exports = app;
