import express from "express";
import protect from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/role.middleware.js";

import {
  getAllPrescriptions,
  approvePrescription,
  rejectPrescription,
} from "../controllers/adminPrescriptionController.js";

const router = express.Router();

/* 🔐 ADMIN ONLY */
router.use(protect, adminOnly);

/* 📄 GET all prescriptions (pending / approved / rejected) */
router.get("/", getAllPrescriptions);

/* ✅ APPROVE prescription */
router.patch("/:id/approve", approvePrescription);

/* ❌ REJECT prescription */
router.patch("/:id/reject", rejectPrescription);

export default router;