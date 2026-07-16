import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { address } = req.body;

    /* =======================
       0️⃣ BASIC VALIDATION
    ======================= */
    if (!address) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    /* =======================
       1️⃣ FETCH USER CART
    ======================= */
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    /* =======================
       2️⃣ PRODUCT & STOCK CHECKS
    ======================= */
    for (let item of cart.items) {
      const product = item.product;

      // Product must exist
      if (!product) {
        return res.status(400).json({
          message: "One of the products no longer exists",
        });
      }

      // Product must be active
      if (!product.isActive) {
        return res.status(400).json({
          message: `${product.name} is currently unavailable`,
        });
      }

      // Product must not be expired (pharmacy rule)
      if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
        return res.status(400).json({
          message: `${product.name} is expired`,
        });
      }

      // Stock must be sufficient
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Only ${product.stock} units left for ${product.name}`,
        });
      }
    }

    /* =======================
       3️⃣ CALCULATE TOTAL
    ======================= */
    let totalAmount = 0;
    cart.items.forEach((item) => {
      totalAmount += item.product.price * item.quantity;
    });

    /* =======================
       4️⃣ CREATE ORDER
    ======================= */
    const order = await Order.create({
      user: userId,
      items: cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
      })),
      address,
      totalAmount,
      paymentMethod: "COD",
      orderStatus: "PLACED",
    });

    /* =======================
       5️⃣ UPDATE PRODUCT STOCK
    ======================= */
    for (let item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: {
          stock: -item.quantity,
          totalSold: item.quantity,
        },
      });
    }

    /* =======================
       6️⃣ CLEAR CART
    ======================= */
    cart.items = [];
    await cart.save();

    /* =======================
       7️⃣ SUCCESS RESPONSE
    ======================= */
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Order creation failed" });
  }
};