import Order from "../models/Order.js";

/* =========================
   📦 GET ALL ORDERS
========================= */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

/* =========================
   🔄 UPDATE ORDER STATUS
========================= */
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  const allowed = ["confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // ❌ Cannot change delivered / cancelled orders
  if (["delivered", "cancelled"].includes(order.status)) {
    return res
      .status(400)
      .json({ message: "Order cannot be updated" });
  }

  order.status = status;
  await order.save();

  res.json({ success: true, message: "Order status updated" });
};