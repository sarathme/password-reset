const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const { catchAsync } = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

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

  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});
