import mongoose from "mongoose";
const prescriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    filePublicId: {
      type: String,
      required: true,
    },

    notes: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    /* ✅ ADD THIS */
    adminComment: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);
export default mongoose.model("Prescription", prescriptionSchema);