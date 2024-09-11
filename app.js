const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const userRouter = require("./routes/userRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
// Middleware to attach body to request object and parse JSON.
app.use(express.json());

// ROUTES

app.use("/api/v1/users", userRouter);

app.use("*", (req, res, next) => {
  next(new AppError("This route is not defined", 404));
});

app.use(globalErrorHandler);
module.exports = app;
