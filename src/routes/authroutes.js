import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/auth.controller.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
/* ✅ LOGOUT (IMPORTANT) */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "none",
    secure: false, // true in production (HTTPS)
  });

  res.json({ success: true, message: "Logged out successfully" });
});
router.get("/me", protect, getMe);

export default router;
