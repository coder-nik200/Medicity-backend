// routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";import protect from "../middleware/auth.middleware.js";
import { createOrder } from "../controllers/orderController.js";
const router = express.Router();

// GET logged-in user's orders
router.get("/my-orders", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error,
    });
  }
});

router.post("/",protect, createOrder);

export default router;

