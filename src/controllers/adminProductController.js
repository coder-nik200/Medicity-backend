import Product from "../models/Product.js";

/* =========================
   📦 GET PRODUCTS (WITH FILTERS)
========================= */
export const getAdminProducts = async (req, res) => {
  try {
    const { search, category, lowStock, expired } = req.query;

    let query = {};

    // 🔍 Search by name or SKU
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // 📂 Category filter
    if (category && category !== "all") {
      query.specialCategory = category;
    }

    // ⚠️ Low stock filter
    if (lowStock === "true") {
      query.$expr = { $lte: ["$stock", "$minStockLevel"] };
    }

    // ⛔ Expired products
    if (expired === "true") {
      query.expiryDate = { $lt: new Date() };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

/* =========================
   🔢 UPDATE STOCK
========================= */
export const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: "Stock update failed" });
  }
};

/* =========================
   🔄 ENABLE / DISABLE PRODUCT
========================= */
export const toggleProductStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
};

/* =========================
   ✏️ EDIT / DELETE / BULK UPSERT
========================= */
export const updateProduct = async (req, res) => {
  try {
    const update = { ...req.body };
    delete update._id;
    delete update.createdAt;
    delete update.updatedAt;
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: "Medicine not found" });
    res.json({ success: true, data: product });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Medicine not found" });
    res.json({ success: true, message: "Medicine deleted" });
  } catch { res.status(500).json({ success: false, message: "Medicine deletion failed" }); }
};

// JSON bulk endpoint for an internal PIM/CSV parser. Each record must have a SKU.
export const bulkUpsertProducts = async (req, res) => {
  try {
    const products = Array.isArray(req.body.products) ? req.body.products : [];
    if (!products.length || products.length > 1000) return res.status(400).json({ success: false, message: "Send 1–1000 medicine records" });
    if (products.some((product) => !product.sku)) return res.status(400).json({ success: false, message: "Every imported medicine needs a SKU" });
    const result = await Product.bulkWrite(products.map((product) => ({ updateOne: { filter: { sku: product.sku }, update: { $set: product }, upsert: true } })), { ordered: false });
    res.status(201).json({ success: true, data: { imported: result.upsertedCount, updated: result.modifiedCount } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
