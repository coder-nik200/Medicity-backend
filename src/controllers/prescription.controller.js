import Prescription from "../models/Prescription.js";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

/**
 * Upload prescription
 */
export const uploadPrescription = async (req, res) => {
  try {
    const { medicineId, notes } = req.body;

    // User check
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Medicine validation
    if (!medicineId) {
      return res.status(400).json({
        success: false,
        message: "Medicine ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    // File validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a prescription image.",
      });
    }

    // Check medicine exists
    const medicine = await Product.findById(medicineId);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found.",
      });
    }

    // Duplicate pending request
    const alreadyExists = await Prescription.findOne({
      user: req.user._id,
      medicine: medicineId,
      status: "pending",
    });

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "A pending prescription already exists for this medicine.",
      });
    }

    const prescription = await Prescription.create({
      user: req.user._id,
      medicine: medicine._id,
      fileUrl: req.file.path,
      filePublicId: req.file.filename,
      notes: notes || "",
      status: "pending",
    });

    await prescription.populate(
      "medicine",
      "name image price prescriptionRequired"
    );

    res.status(201).json({
      success: true,
      message: "Prescription uploaded successfully.",
      prescription,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Prescription upload failed.",
      error: err.message,
    });
  }
};

/**
 * Get logged-in user's prescriptions
 */
export const getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      user: req.user._id,
    })
      .populate("medicine", "name price image prescriptionRequired")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch prescriptions",
      error: error.message,
    });
  }
};

/**
 * Delete prescription (and Cloudinary image)
 */
export const deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (prescription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (prescription.status === "approved") {
      return res.status(400).json({
        message: "Approved prescriptions cannot be deleted",
      });
    }

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(prescription.filePublicId);

    await prescription.deleteOne();

    res.status(200).json({
      message: "Prescription deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete prescription",
      error: error.message,
    });
  }
};