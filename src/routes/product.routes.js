import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductFilters,
  getProductsByCategory,
  getSearchSuggestions,
  getSpecificProduct,
  getTrendingMedicines,
  getBestSellers,
  getDiscountedMedicines,
  getByPrescriptionRequirement,
  searchByMultipleCriteria,
  getRecommendations,
  getStatistics,
  getProductsByDosageForm,
  getPrescriptionMedicines,
} from "../controllers/product.controller.js";
import protect from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/role.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Create product
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  createProduct
);

// Get all products with filters and search
router.get("/", getAllProducts);

router.get("/prescription", getPrescriptionMedicines);

// Get product filters
router.get("/filters", getProductFilters);

// Search suggestions
router.get("/search/suggestions", getSearchSuggestions);

// Advanced search
router.get("/search/multi-criteria", searchByMultipleCriteria);

// Trending medicines
router.get("/discover/trending", getTrendingMedicines);

// Best sellers
router.get("/discover/best-sellers", getBestSellers);

// Discounted medicines
router.get("/discover/discounted", getDiscountedMedicines);

// Prescription requirement
router.get("/discover/prescription", getByPrescriptionRequirement);

// Statistics
router.get("/discover/statistics", getStatistics);

// Get by dosage form
router.get("/dosage-form/:dosageForm", getProductsByDosageForm);

// Get by category - MUST come before :id
router.get("/category/:category", getProductsByCategory);

// Get recommendations for a product
router.get("/:id/recommendations", getRecommendations);

// Get specific product
router.get("/:id", getSpecificProduct);

export default router;
