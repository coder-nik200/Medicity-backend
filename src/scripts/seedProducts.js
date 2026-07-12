import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Product from "../models/Product.js";
import products from "../data/products.js";
import cloudinary from "../config/cloudinary.js";

dotenv.config();

const seedProducts = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // 2️⃣ Clear existing products
    await Product.deleteMany();
    console.log("Old products removed");

    const seededProducts = [];

    // 3️⃣ Upload images to Cloudinary one by one
    for (const product of products) {
      console.log(`Uploading image for: ${product.name}`);

      // Convert relative path -> absolute path (Windows safe)
      const imagePath = path.resolve(product.image);

      const uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: "products",
      });

      seededProducts.push({
        ...product,
        image: uploadResult.secure_url, // ✅ Cloudinary URL saved
      });
    }

    // 4️⃣ Insert into MongoDB
    await Product.insertMany(seededProducts);
    console.log("Products seeded successfully with Cloudinary images");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedProducts();