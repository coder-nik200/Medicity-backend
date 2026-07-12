import express from "express";
import protect from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/role.middleware.js";
import { bulkUpsertProducts, deleteProduct, getAdminProducts, toggleProductStatus, updateProduct, updateProductStock } from "../controllers/adminProductController.js";

const router = express.Router();

/* 🔐 ADMIN ONLY */
router.use(protect, adminOnly);

/* 📦 Inventory */
router.get("/", getAdminProducts);
router.post("/bulk", bulkUpsertProducts);
router.patch("/:id", updateProduct);
router.patch("/:id/stock", updateProductStock);
router.patch("/:id/status", toggleProductStatus);
router.delete("/:id", deleteProduct);

export default router;
