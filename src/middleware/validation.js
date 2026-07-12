// Input Validation Utilities
// Validates user inputs to prevent errors and security issues

/**
 * Validate search query
 */
export const validateSearchQuery = (query) => {
  if (!query) return { valid: false, error: "Search query is required" };
  if (typeof query !== "string") return { valid: false, error: "Search query must be a string" };

  const trimmed = query.trim();
  if (trimmed.length < 1) return { valid: false, error: "Search query cannot be empty" };
  if (trimmed.length > 100) return { valid: false, error: "Search query too long (max 100 characters)" };

  return { valid: true, query: trimmed };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (page, limit) => {
  const pageNum = Math.max(1, Number.parseInt(page || 1, 10));
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit || 24, 10)));

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };
};

/**
 * Validate price range
 */
export const validatePriceRange = (minPrice, maxPrice) => {
  const min = minPrice ? Math.max(0, Number.parseFloat(minPrice)) : 0;
  const max = maxPrice ? Math.max(0, Number.parseFloat(maxPrice)) : Infinity;

  if (min > max) {
    return { valid: false, error: "Min price cannot be greater than max price" };
  }

  return { valid: true, minPrice: min, maxPrice: max };
};

/**
 * Validate filter parameters
 */
export const validateFilters = (filters) => {
  const validated = {};
  const errors = [];

  // Validate category
  if (filters.category) {
    validated.category = String(filters.category).trim();
    if (validated.category.length > 50) errors.push("Category name too long");
  }

  // Validate manufacturer
  if (filters.manufacturer) {
    validated.manufacturer = String(filters.manufacturer).trim();
    if (validated.manufacturer.length > 100) errors.push("Manufacturer name too long");
  }

  // Validate dosage form
  if (filters.dosageForm) {
    validated.dosageForm = String(filters.dosageForm).trim();
    if (validated.dosageForm.length > 50) errors.push("Dosage form too long");
  }

  // Validate prescription required
  if (filters.prescriptionRequired !== undefined && filters.prescriptionRequired !== "all") {
    const val = String(filters.prescriptionRequired).toLowerCase();
    if (!["true", "false"].includes(val)) {
      errors.push("Invalid prescription requirement value");
    } else {
      validated.prescriptionRequired = val === "true";
    }
  }

  // Validate stock filter
  if (filters.inStock !== undefined) {
    const val = String(filters.inStock).toLowerCase();
    if (!["true", "false"].includes(val)) {
      errors.push("Invalid stock filter value");
    } else {
      validated.inStock = val === "true";
    }
  }

  // Validate discount filter
  if (filters.discount !== undefined) {
    const val = String(filters.discount).toLowerCase();
    if (!["true", "false"].includes(val)) {
      errors.push("Invalid discount filter value");
    } else {
      validated.discount = val === "true";
    }
  }

  return {
    valid: errors.length === 0,
    filters: validated,
    errors,
  };
};

/**
 * Validate sorting parameter
 */
export const validateSort = (sort) => {
  const validSorts = [
    "popular",
    "best-selling",
    "newest",
    "rating",
    "price-asc",
    "price-desc",
    "name-asc",
    "name-desc",
  ];

  if (!sort || !validSorts.includes(sort)) {
    return { valid: false, sort: "popular" };
  }

  return { valid: true, sort };
};

/**
 * Validate MongoDB ObjectId
 */
export const validateMongoId = (id) => {
  if (!id) return { valid: false, error: "ID is required" };

  // MongoDB ObjectId validation regex
  const mongoIdRegex = /^[a-f\d]{24}$/i;
  if (!mongoIdRegex.test(id)) {
    return { valid: false, error: "Invalid product ID format" };
  }

  return { valid: true };
};

/**
 * Sanitize and validate product data
 */
export const validateProductData = (data) => {
  const errors = [];
  const validated = {};

  // Validate name
  if (!data.name || String(data.name).trim().length === 0) {
    errors.push("Product name is required");
  } else {
    validated.name = String(data.name).trim();
    if (validated.name.length > 100) errors.push("Product name too long");
  }

  // Validate generic name
  if (data.genericName) {
    validated.genericName = String(data.genericName).trim();
  }

  // Validate brand
  if (data.brand) {
    validated.brand = String(data.brand).trim();
    if (validated.brand.length > 100) errors.push("Brand name too long");
  }

  // Validate manufacturer
  if (data.manufacturer) {
    validated.manufacturer = String(data.manufacturer).trim();
  }

  // Validate price
  if (data.price !== undefined) {
    const price = Number.parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      errors.push("Invalid price");
    } else {
      validated.price = price;
    }
  }

  // Validate stock
  if (data.stock !== undefined) {
    const stock = Number.parseInt(data.stock, 10);
    if (isNaN(stock) || stock < 0) {
      errors.push("Invalid stock quantity");
    } else {
      validated.stock = stock;
    }
  }

  // Validate category
  if (data.category) {
    validated.category = String(data.category).trim();
  }

  // Validate prescription required
  if (data.prescriptionRequired !== undefined) {
    validated.prescriptionRequired = Boolean(data.prescriptionRequired);
  }

  return {
    valid: errors.length === 0,
    data: validated,
    errors,
  };
};

export default {
  validateSearchQuery,
  validatePagination,
  validatePriceRange,
  validateFilters,
  validateSort,
  validateMongoId,
  validateProductData,
};
