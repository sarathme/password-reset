const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const userRouter = require("./routes/userRoutes");

// Calling the express function.

const app = express();

// Enabling cors for the frontend domain.

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// USING COOKIE-PARSER PACKAGE TO PARSE THE COOKIES IN THE HEADER.

app.use(cookieParser());

// Middleware to attach body to request object and parse JSON.
app.use(express.json());

// ROUTES FOR THE USERS.

app.use("/api/v1/users", userRouter);

// FALLBACK ROUTE FOR THE UNDEFINED ROUTES.

app.use("*", (req, res, next) => {
  next(new AppError("This route is not defined", 404));
});

// MIDDLEWARE TO ESTABLISH THE GLOBAL ERROR HANDLER.

app.use(globalErrorHandler);

// EXPORTING THE express app.

module.exports = app;
