import Prescription from "../models/Prescription.js";

/* =========================
   📄 GET ALL PRESCRIPTIONS
========================= */
export const getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate("user", "name email")
      .populate("medicine", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
    });
  }
};

/* =========================
   ✅ APPROVE PRESCRIPTION
========================= */
export const approvePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    prescription.status = "approved";
    prescription.reviewedBy = req.user._id;
    prescription.reviewedAt = new Date();
    prescription.adminComment = req.body.comment || "";

    await prescription.save();

    res.json({
      success: true,
      message: "Prescription approved",
    });
  } catch (error) {
    res.status(500).json({ message: "Approval failed" });
  }
};

/* =========================
   ❌ REJECT PRESCRIPTION
========================= */
export const rejectPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (!req.body.comment) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    prescription.status = "rejected";
    prescription.reviewedBy = req.user._id;
    prescription.reviewedAt = new Date();
    prescription.adminComment = req.body.comment;

    await prescription.save();

    res.json({
      success: true,
      message: "Prescription rejected",
    });
  } catch (error) {
    res.status(500).json({ message: "Rejection failed" });
  }
};