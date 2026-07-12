import express from "express";
import protect from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/role.middleware.js";
import { getAllOrders, updateOrderStatus } from "../controllers/adminOrderController.js";

const router = express.Router();

router.use(protect, adminOnly);

// 📦 all orders
router.get("/", getAllOrders);

// 🔄 update status
router.patch("/:id/status", updateOrderStatus);

export default router;