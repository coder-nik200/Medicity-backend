import express from "express";

import upload from "../middleware/prescriptionUpload.js";
import protect from "../middleware/auth.middleware.js";
import { deletePrescription, getMyPrescriptions, uploadPrescription } from "../controllers/prescription.controller.js";

const router = express.Router();

router.post(
  "/",
  protect,
  upload.single("prescription"),
  uploadPrescription
);
router.delete("/:id", protect, deletePrescription);
router.get("/my", protect, getMyPrescriptions);
export default router;