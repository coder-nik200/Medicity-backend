import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    brandName: { type: String, trim: true, index: true },
    manufacturer: { type: String, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    specialCategory: {
      type: String,
      default: "Health Care",
      enum: ["Pain Relief", "Diabetes Care", "Health Care", "Vitamins & Minerals", "Cold & Flu", "Digestive Care", "Skin Care", "Other"],
      index: true,
    },
    composition: { type: String, trim: true, index: true },
    strength: { type: String, trim: true },
    dosageForm: { type: String, trim: true, index: true },
    description: String,
    uses: [String],
    sideEffects: [String],
    precautions: [String],
    warnings: [String],
    dosage: String,
    storageInstructions: String,
    tags: [{ type: String, trim: true }],
    searchTerms: [{ type: String, trim: true, index: true }],
    sku: { type: String, unique: true, sparse: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    discountPrice: { type: Number, min: 0, index: true },
    costPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 12, min: 0 },
    stock: { type: Number, required: true, min: 0, index: true },
    minStockLevel: { type: Number, default: 10, min: 0 },
    expiryDate: { type: Date, required: true, index: true },
    batchNumber: { type: String, required: true },
    prescriptionRequired: { type: Boolean, default: false, index: true },
    totalSold: { type: Number, default: 0, min: 0, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5, index: true },
    reviewCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    image: { type: String, default: "https://placehold.co/600x600/e0f2fe/075985?text=Medicine" },
    images: [String],
    source: { type: String, default: "manual" },
  },
  { timestamps: true }
);

// Supports fast relevance search and the most common storefront query shapes.
productSchema.index({ name: "text", genericName: "text", brand: "text", manufacturer: "text", composition: "text", tags: "text" }, { weights: { name: 10, genericName: 8, brand: 6, composition: 5, manufacturer: 3, tags: 2 } });
productSchema.index({ isActive: 1, category: 1, price: 1 });
productSchema.index({ isActive: 1, prescriptionRequired: 1, dosageForm: 1, price: 1 });
productSchema.index({ isActive: 1, totalSold: -1, rating: -1 });

export default mongoose.model("Product", productSchema);
