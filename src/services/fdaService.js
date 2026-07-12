// FDA Drug Data Integration Service
// Fetches real drug data from OpenFDA API
// OpenFDA API Documentation: https://open.fda.gov/apis/

import axios from "axios";

const FDA_API_BASE = "https://api.fda.gov/drug";
const API_KEY = process.env.FDA_API_KEY || ""; // Optional: get free key from https://open.fda.gov/apis/authentication/

// Create axios instance with timeout
const fdaClient = axios.create({
  baseURL: FDA_API_BASE,
  timeout: 30000,
  headers: {
    "User-Agent": "Medicity-Pharmacy/1.0",
  },
});

/**
 * Fetch drug products from FDA database
 * @param {Object} options - Query options
 * @param {Number} options.skip - Results to skip (pagination)
 * @param {Number} options.limit - Results to return
 * @param {String} options.search - Search term
 * @returns {Promise<Array>} Array of drug products
 */
export const fetchFDADrugs = async ({ skip = 0, limit = 100, search = "" } = {}) => {
  try {
    let query = "approved_drug.listing_status:Approved";

    if (search) {
      // Search by generic name, brand name, or manufacturer
      query = `(generic_name:"${search}" OR products.brand_name:"${search}" OR manufacturer_name:"${search}")`;
    }

    const url = `/ndc/search.json?search=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}${API_KEY ? `&api_key=${API_KEY}` : ""}`;

    const response = await fdaClient.get(url);
    return response.data.results || [];
  } catch (error) {
    console.error("FDA API Error:", error.message);
    return [];
  }
};

/**
 * Fetch drug by exact name
 */
export const fetchDrugByName = async (drugName) => {
  try {
    const query = `products.brand_name:"${drugName}" OR generic_name:"${drugName}"`;
    const url = `/ndc/search.json?search=${encodeURIComponent(query)}&limit=1${API_KEY ? `&api_key=${API_KEY}` : ""}`;
    const response = await fdaClient.get(url);
    return response.data.results?.[0] || null;
  } catch (error) {
    console.error("FDA API Error:", error.message);
    return null;
  }
};

/**
 * Fetch adverse events for a drug
 */
export const fetchDrugAdverseEvents = async (drugName) => {
  try {
    const query = `safetyreports.openfda.generic_name:"${drugName}"`;
    const url = `/event/search.json?search=${encodeURIComponent(query)}&limit=5&sort=report_date:desc${API_KEY ? `&api_key=${API_KEY}` : ""}`;
    const response = await fdaClient.get(url);
    return response.data.results || [];
  } catch (error) {
    return [];
  }
};

/**
 * Transform FDA drug data to our Product model format
 */
export const transformFDADrugToProduct = (fdaDrug) => {
  try {
    const product = fdaDrug.products?.[0];
    if (!product) return null;

    const activeIngredients = product.active_ingredients?.map((ing) => `${ing.name} ${ing.strength}`).join(", ") || "N/A";

    return {
      name: product.brand_name || fdaDrug.generic_name || "Unknown",
      genericName: fdaDrug.generic_name || "N/A",
      brand: product.brand_name || "N/A",
      manufacturer: fdaDrug.manufacturer_name || "N/A",
      composition: activeIngredients,
      dosageForm: product.dosage_form || "Tablet",
      strength: product.strength || "N/A",
      category: categorizeByDosageForm(product.dosage_form || ""),
      prescriptionRequired: product.rx_otc_status === "Rx" || false,
      price: Math.random() * 500 + 20, // Random price for demo (replace with real pricing)
      discountPrice: null,
      stock: Math.floor(Math.random() * 500) + 50,
      minStock: 10,
      uses: ["Consult pharmacist for uses"],
      sideEffects: ["Consult product literature"],
      precautions: ["Read product label"],
      warnings: ["Not for use without consultation"],
      storageInstructions: "Store in cool, dry place",
      batchNumber: `FDA-${Date.now()}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      SKU: fdaDrug.ndc_code || `SKU-${Date.now()}`,
      tags: [fdaDrug.generic_name, product.brand_name, fdaDrug.manufacturer_name].filter(Boolean),
      totalSold: Math.floor(Math.random() * 500),
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      reviewCount: Math.floor(Math.random() * 100),
      image: `https://via.placeholder.com/300x300?text=${encodeURIComponent(product.brand_name || fdaDrug.generic_name)}`,
      isActive: true,
    };
  } catch (error) {
    console.error("Error transforming FDA drug:", error);
    return null;
  }
};

/**
 * Categorize medicine based on dosage form or name
 */
const categorizeByDosageForm = (dosageForm = "") => {
  const categories = {
    "Tablets": "Pain Relief",
    "Capsules": "Vitamins & Minerals",
    "Syrup": "Cold & Flu",
    "Injection": "Antibiotic",
    "Cream": "Skin Care",
    "Ointment": "Skin Care",
    "Powder": "Digestive Care",
    "Suspension": "Digestive Care",
  };

  for (const [key, category] of Object.entries(categories)) {
    if (dosageForm.toLowerCase().includes(key.toLowerCase())) {
      return category;
    }
  }

  // Default categories
  const defaultCategories = [
    "Pain Relief",
    "Cold & Flu",
    "Diabetes Care",
    "Digestive Care",
    "Vitamins & Minerals",
    "Antibiotic",
    "Skin Care",
  ];

  return defaultCategories[Math.floor(Math.random() * defaultCategories.length)];
};

export default {
  fetchFDADrugs,
  fetchDrugByName,
  fetchDrugAdverseEvents,
  transformFDADrugToProduct,
};
