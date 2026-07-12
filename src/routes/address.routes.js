import express from "express";
import protect from "../middleware/auth.middleware.js";
import { addAddress, deleteAddress, getMyAddresses } from "../controllers/address.controller.js";

const router = express.Router();

router.post("/", protect, addAddress);
router.get("/", protect, getMyAddresses);
router.delete("/:id", protect, deleteAddress);

export default router;
