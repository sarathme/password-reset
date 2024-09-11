const express = require("express");

const userController = require("./../controllers/userController");

const router = express.Router();

router.route("/signup").post(userController.signup);
router.route("/login").post(userController.login);

router.route("/forgotPassword").post(userController.forgotPassword);
router.route("/resetPassword/:token").patch(userController.resetPassword);

router.route("/:userId").get(userController.protect, userController.getUser);
router.route("/protect").get(userController.protect, (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

module.exports = router;
