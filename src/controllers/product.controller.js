import Product from "../models/Product.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asList = (value) => (Array.isArray(value) ? value : String(value || "").split(",")).map((item) => item.trim()).filter(Boolean);
const compact = (value = "") => String(value).replace(/\s+/g, " ").trim();
// Small bounded TTL cache for type-ahead traffic; MongoDB remains the source of truth.
const suggestionCache = new Map();

const buildSearchFilter = (query) => {
  const term = compact(query);
  if (!term) return null;
  const words = term.split(" ").filter(Boolean);
  // Prefix matching gives useful partial-word results while the text index ranks exact terms.
  const prefix = words.map((word) => `(?=.*${escapeRegex(word)})`).join("");
  return {
    $or: [
      { $text: { $search: term } },
      { name: { $regex: prefix, $options: "i" } },
      { genericName: { $regex: prefix, $options: "i" } },
      { brand: { $regex: prefix, $options: "i" } },
      { manufacturer: { $regex: prefix, $options: "i" } },
      { composition: { $regex: prefix, $options: "i" } },
      { searchTerms: { $regex: prefix, $options: "i" } },
    ],
  };
};

const buildFilter = (params, { includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const { category, brand, manufacturer, dosageForm, prescriptionRequired, minPrice, maxPrice, inStock, discount } = params;
  if (category && category !== "all") filter.category = { $in: asList(category) };
  if (brand && brand !== "all") filter.brand = { $in: asList(brand) };
  if (manufacturer && manufacturer !== "all") filter.manufacturer = { $in: asList(manufacturer) };
  if (dosageForm && dosageForm !== "all") filter.dosageForm = { $in: asList(dosageForm) };
  if (prescriptionRequired !== undefined && prescriptionRequired !== "all") filter.prescriptionRequired = prescriptionRequired === "true";
  if (inStock === "true") filter.stock = { $gt: 0 };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (discount === "true") filter.$expr = { $lt: ["$discountPrice", "$price"] };
  return filter;
};

const sortMap = {
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  "best-selling": { totalSold: -1, _id: -1 },
  rating: { rating: -1, reviewCount: -1 },
  popular: { totalSold: -1, rating: -1 },
  "name-asc": { name: 1 },
  "name-desc": { name: -1 },
};

export const createProduct = async (req, res) => {
  try {
    const body = { ...req.body };
    // if (req.file) body.image = req.file.path;
    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file.buffer,
        "products"
      );

      body.image = uploaded.secure_url;
      body.imagePublicId = uploaded.public_id;
    }
    if (!body.image && !body.images) body.image = undefined;
    ["uses", "sideEffects", "precautions", "warnings", "tags", "images"].forEach((key) => {
      if (body[key]) body[key] = asList(body[key]);
    });
    body.brandName ||= body.brand;
    body.genericName ||= body.name;
    body.composition ||= body.genericName;
    body.searchTerms = [body.name, body.genericName, body.brand, body.manufacturer, body.composition, ...(body.tags || [])].filter(Boolean);
    const savedProduct = await Product.create(body);
    res.status(201).json({ success: true, message: "Product created successfully", data: savedProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const filter = buildFilter(req.query, { includeInactive: req.query.isActive !== undefined });
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    const searchFilter = buildSearchFilter(req.query.q || req.query.search);
    if (searchFilter) filter.$and = [searchFilter];
    const sort = sortMap[req.query.sort] || (req.query.q || req.query.search ? { score: { $meta: "textScore" }, totalSold: -1 } : sortMap.newest);
    const projection = req.query.q || req.query.search ? { score: { $meta: "textScore" } } : {};
    const [products, total] = await Promise.all([
      Product.find(filter, projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, count: products.length, data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNextPage: page * limit < total } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch medicines" });
  }
};

export const getPrescriptionMedicines = async (req, res) => {
  try {
    const medicines = await Product.find({
      prescriptionRequired: true,
      isActive: true,
    }).lean();

    res.json({
      success: true,
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch prescription medicines",
    });
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const term = compact(req.query.q);
    if (term.length < 2) return res.json({ success: true, data: [] });
    const key = term.toLowerCase();
    const cached = suggestionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return res.json({ success: true, data: cached.data, cached: true });
    const regex = new RegExp(escapeRegex(term), "i");
    const products = await Product.find({ isActive: true, $or: [{ name: regex }, { genericName: regex }, { brand: regex }, { composition: regex }] })
      .select("name genericName brand dosageForm image prescriptionRequired").sort({ totalSold: -1 }).limit(8).lean();
    const seen = new Set();
    const data = products.filter((product) => !seen.has(product.name.toLowerCase()) && seen.add(product.name.toLowerCase()));
    suggestionCache.set(key, { data, expiresAt: Date.now() + 30_000 });
    if (suggestionCache.size > 200) suggestionCache.delete(suggestionCache.keys().next().value);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: "Unable to load suggestions" });
  }
};

export const getProductFilters = async (_req, res) => {
  try {
    const [categories, brands, manufacturers, dosageForms] = await Promise.all([
      Product.distinct("category", { isActive: true }), Product.distinct("brand", { isActive: true }),
      Product.distinct("manufacturer", { isActive: true }), Product.distinct("dosageForm", { isActive: true }),
    ]);
    res.json({ success: true, data: { categories: categories.filter(Boolean).sort(), brands: brands.filter(Boolean).sort(), manufacturers: manufacturers.filter(Boolean).sort(), dosageForms: dosageForms.filter(Boolean).sort() } });
  } catch { res.status(500).json({ success: false, message: "Unable to load filters" }); }
};

export const getSpecificProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const relatedFilter = { isActive: true, _id: { $ne: product._id }, $or: [{ category: product.category }, { genericName: product.genericName }, { composition: product.composition }] };
    const related = await Product.find(relatedFilter).sort({ totalSold: -1, rating: -1 }).limit(8).lean();
    res.json({ success: true, data: product, related });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);

    const products = await Product.find({
      category,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== NEW ADVANCED ENDPOINTS ====================

export const getTrendingMedicines = async (req, res) => {
  try {
    const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    // Trending = recently added + high sales + good rating
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const products = await Product.find({
      isActive: true,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ totalSold: -1, rating: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch trending medicines" });
  }
};

export const getBestSellers = async (req, res) => {
  try {
    const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const category = req.query.category;
    const filter = { isActive: true, stock: { $gt: 0 } };
    if (category && category !== "all") filter.category = category;
    const products = await Product.find(filter)
      .sort({ totalSold: -1, rating: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch best sellers" });
  }
};

export const getDiscountedMedicines = async (req, res) => {
  try {
    const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const minDiscount = Number.parseInt(req.query.minDiscount, 10) || 10;
    
    const products = await Product.find({ isActive: true })
      .lean()
      .then((items) => {
        return items
          .filter((item) => {
            if (!item.price || !item.discountPrice) return false;
            const discountPercent = ((item.price - item.discountPrice) / item.price) * 100;
            return discountPercent >= minDiscount;
          })
          .sort((a, b) => {
            const aDiscount = ((a.price - a.discountPrice) / a.price) * 100;
            const bDiscount = ((b.price - b.discountPrice) / b.price) * 100;
            return bDiscount - aDiscount;
          })
          .slice(0, limit);
      });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch discounted medicines" });
  }
};

export const getByPrescriptionRequirement = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const prescriptionRequired = req.query.prescription === "true";
    
    const filter = { isActive: true, prescriptionRequired };
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ totalSold: -1, rating: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    
    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch medicines" });
  }
};

export const searchByMultipleCriteria = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    
    const filter = { isActive: true };
    
    // Generic name search (exact or partial)
    if (req.query.genericName) {
      filter.genericName = { $regex: req.query.genericName, $options: "i" };
    }
    
    // Brand search
    if (req.query.brand) {
      filter.brand = { $regex: req.query.brand, $options: "i" };
    }
    
    // Manufacturer search
    if (req.query.manufacturer) {
      filter.manufacturer = { $regex: req.query.manufacturer, $options: "i" };
    }
    
    // Composition search
    if (req.query.composition) {
      filter.composition = { $regex: req.query.composition, $options: "i" };
    }
    
    // Dosage form
    if (req.query.dosageForm) {
      filter.dosageForm = { $in: asList(req.query.dosageForm) };
    }
    
    const sort = sortMap[req.query.sort] || { totalSold: -1, rating: -1 };
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    
    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const productId = req.params.id;
    const limit = Math.min(12, Math.max(1, Number.parseInt(req.query.limit, 10) || 8));
    
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    // Get frequently bought together (same category, similar price)
    const priceRange = product.price * 0.3; // 30% price variance
    const recommendations = await Product.find({
      _id: { $ne: productId },
      isActive: true,
      category: product.category,
      price: { $gte: product.price - priceRange, $lte: product.price + priceRange },
    })
      .sort({ totalSold: -1, rating: -1 })
      .limit(limit)
      .lean();
    
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch recommendations" });
  }
};

export const getStatistics = async (_req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          avgRating: { $avg: "$rating" },
          totalStock: { $sum: "$stock" },
          totalSold: { $sum: "$totalSold" },
        },
      },
    ]);

    const byCategory = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
      { $sort: { count: -1 } },
    ]);

    const topRated = await Product.find({ isActive: true })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        overall: stats[0],
        byCategory,
        topRated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch statistics" });
  }
};

export const getProductsByDosageForm = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const dosageForm = req.params.dosageForm;
    
    const filter = { isActive: true, dosageForm: { $regex: dosageForm, $options: "i" } };
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ totalSold: -1, rating: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    
    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch medicines" });
  }
};
