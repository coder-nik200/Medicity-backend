import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authroutes.js";
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

// Connect to MongoDB
connectDB();

/* -------------------- MIDDLEWARES -------------------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === "http://localhost:5173" ||
        /\.vercel\.app$/.test(new URL(origin).hostname)
      ) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* -------------------- TEST ROUTE -------------------- */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running 🚀",
  });
});

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

/* -------------------- ERROR HANDLER -------------------- */
app.use(errorHandler);

// Export Express app for Vercel
export default app;