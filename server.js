import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authroutes.js";
import cookieParser from "cookie-parser";
import productRoutes from "./src/routes/product.routes.js";
import prescriptionRoutes from "./src/routes/prescriptionRoutes.js";
import adminPrescriptionRoutes from "./src/routes/adminPrescriptionRoutes.js";
import userRoutes from "./src/routes/user.routes.js";
import addressRoutes from "./src/routes/address.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import cartRoutes from "./src/routes/cart.routes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import adminProductRoutes from "./src/routes/adminProductRoutes.js";
import adminOrderRoutes from "./src/routes/adminOrderRoutes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();

/* -------------------- MIDDLEWARES -------------------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

/* -------------------- TEST ROUTE -------------------- */
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

/* -------------------- DATABASE -------------------- */
connectDB();

/* -------------------- ROUTES -------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/prescriptions", adminPrescriptionRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

// Keeps unexpected errors from leaking implementation details to clients.
app.use(errorHandler);

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

//node src/scripts/seedProducts.js
