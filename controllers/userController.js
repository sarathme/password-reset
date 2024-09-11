const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const sendEmail = require("./../utils/email");
const { catchAsync } = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const { promisify } = require("util");

const URL = process.env.DB_CONNECTION.replace(
  "<PASSWORD>",
  process.env.DB_PASSWORD
);

const client = new MongoClient(URL);

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    next(new AppError("Please provide the required fields", 400));
    return;
  }

  await client.connect();
  const database = client.db("Password_Reset");
  const userCollection = database.collection("users");

  const existingUser = await userCollection.findOne({ email });

  if (existingUser) {
    next(new AppError(`User with the email already exists`, 400));
    await client.close();
    return;
  }

  const newUser = { name, email };

  newUser.password = await bcrypt.hash(password, 12);

  const created = await userCollection.insertOne(newUser);

  const user = await userCollection.findOne(
    { _id: created.insertedId },
    { projection: { password: 0 } }
  );

  await client.close();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.cookie("jtoken", token, {
    httpOnly: true,
    maxAge: process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    sameSite: "Strict",
    secure: false,
  });
  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    next(new AppError("Please provide email and password", 400));
    return;
  }
  await client.connect();
  const database = client.db("Password_Reset");
  const userCollection = database.collection("users");

  const user = await userCollection.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    next(new AppError("Invalid email or password", 401));
    await client.close();
    return;
  }
  user.password = undefined;
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  res.cookie("jtoken", token, {
    httpOnly: true,
    maxAge: process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    secure: false,
    sameSite: "Lax",
    path: "/",
  });
  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide a email", 400));
  }
  await client.connect();

  const db = client.db("Password_Reset");
  const userCollection = db.collection("users");
  const user = await userCollection.findOne({ email });

  if (!user) {
    next(new AppError("No user found with the email", 404));
    await client.close();
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await userCollection.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        passwordResetToken,
        resetTokenExpiresAt,
      },
    }
  );

  const resetURL = `${req.headers["x-frontend-url"]}/resetPassword/${resetToken}`;
  const message = `Forget your password? Please send a request with your new password ${resetURL}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset Token (valid for 10 mins)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Email sent successfully",
    });
  } catch (err) {
    await userCollection.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: undefined,
          resetTokenExpiresAt: undefined,
        },
      }
    );
    await client.close();
    return next(new AppError("Problem sending email. Please try again", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  await client.connect();
  const database = client.db("Password_Reset");
  const userCollection = database.collection("users");

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  let user = await userCollection.findOne({
    passwordResetToken: hashedToken,
    resetTokenExpiresAt: { $gt: new Date(Date.now()) },
  });

  if (!user) {
    await client.close();
    return next(new AppError("Token is invalid or expired", 400));
  }

  const password = await bcrypt.hash(req.body.password, 12);

  user = await userCollection.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        password,
        passwordResetToken: undefined,
        resetTokenExpiresAt: undefined,
      },
    },
    {
      returnDocument: "after",
      projection: {
        passwordResetToken: 0,
        resetTokenExpiresAt: 0,
        password: 0,
      },
    }
  );

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(200).json({
    status: "success",
    token,
    user,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  console.log("Got here");
  const user = {
    ...req.user,
    password: undefined,
    passwordResetToken: undefined,
    resetTokenExpiresAt: undefined,
  };
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  console.log(req.headers.authorization);
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (req.cookies.jtoken) {
    token = req.cookies.jtoken;
  }

  // Check if the token exists
  if (!token) {
    return next(
      new AppError("You are not logged in. Please login to continue", 401)
    );
  }

  // Verify the token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      new AppError("Session expired. Please login again to continue", 401)
    );
  }
  await client.connect();
  const database = client.db("Password_Reset");
  const userCollection = database.collection("users");
  // Check if the user exists
  const currentUser = await userCollection.findOne({
    _id: new ObjectId(decoded.id),
  });

  if (!currentUser) {
    await client.close();
    return next(new AppError("User doesn't exists or invalid token", 401));
  }

  req.user = currentUser;
  next();
});
