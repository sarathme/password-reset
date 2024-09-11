const express = require("express");

// Require the userController.

const userController = require("./../controllers/userController");

// Creating the router instance.

const router = express.Router();

// Creating routes and add handler functions for the coresponding routes.

// ROUTES TO SIGNUP AND LOGIN.

router.route("/signup").post(userController.signup);
router.route("/login").post(userController.login);

// ROUTES TO RESET PASSWORD.

router.route("/forgotPassword").post(userController.forgotPassword);
router.route("/resetPassword/:token").patch(userController.resetPassword);

// router.route("/:userId").get(userController.protect, userController.getUser);

// USING THE PROTECT MIDDLEWARE TO CHECK FOR THE USER LOGGEDIN STATUS.

router.route("/protect").get(userController.protect, (req, res, next) => {
  // Sending the success response if the user is Authenticated.

  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

// Exporting the router instance.

module.exports = router;
