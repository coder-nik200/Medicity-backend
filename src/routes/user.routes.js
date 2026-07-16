import express from "express";
import protect from "../middleware/auth.middleware.js";
import { updateUserProfile } from "../controllers/user.controller.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import Prescription from "../models/Prescription.js";
import Cart from "../models/Cart.js";

const router = express.Router();

router.put("/profile", protect, updateUserProfile);

router.get("/dashboard-stats", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Cart items count
    const cart = await Cart.findOne({ user: userId });
    const cartItems = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    // Orders count
    const orders = await Order.countDocuments({ user: userId });

    // Addresses count
    const addresses = await Address.countDocuments({ user: userId });

    // Prescriptions count
    const prescriptions = await Prescription.countDocuments({
      user: userId,
    });

    res.status(200).json({
      success: true,
      stats: {
        cartItems,
        orders,
        prescriptions,
        addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch dashboard stats",
      error,
    });
  }
});

export default router;
