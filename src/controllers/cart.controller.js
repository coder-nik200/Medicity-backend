import Cart from "../models/cart.js";
import Product from "../models/Product.js";

// 🔹 Add To Cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId,
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }
      await cart.save();
    }

    cart = await cart.populate("items.product");
    res
      .status(200)
      .json({ success: true, message: "Added to cart", items: cart.items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Get Cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    res.status(200).json({ items: cart?.items || [] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Update Quantity
export const updateCart = async (req, res) => {
  try {
    const { productId, action } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (action === "increment") item.quantity += 1;
    if (action === "decrement" && item.quantity > 1) item.quantity -= 1;

    await cart.save();
    await cart.populate("items.product");
    res.json({ success: true, items: cart.items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Remove Item
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    await cart.save();
    await cart.populate("items.product");

    res.json({ success: true, message: "Item removed", items: cart.items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔹 Cleat Cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, items: [] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
