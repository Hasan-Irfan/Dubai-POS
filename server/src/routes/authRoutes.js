import { Router } from "express";
import {
  login,
  Signup,
  logout,
  resetPassword,
  updatePassword,
  refreshAccessToken,
  changePassword
} from "../controllers/authController.js";
import { jwtVerify } from "../middlewares/authChecker.js";
const router = Router();

router.route("/signup").post(Signup);
router.route("/login").post(login);
router.route("/logout").post(jwtVerify, logout);
router.route("/refresh").post(refreshAccessToken);

router.route("/reset-password").post(resetPassword);
router.route("/update-password/:resetToken").post(updatePassword);
router.route("/change-password").post(jwtVerify, changePassword);

router.route("/verify").post(jwtVerify, (req, res) => {
  return res.status(200).json({ success: true, message: "Token is valid" });
});

export default router;
