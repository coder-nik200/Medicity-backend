// src/test-cloudinary.js
import dotenv from "dotenv";
dotenv.config(); // 👈 entry file loads env

import cloudinary from "./config/cloudinary.js";

const test = async () => {
  const result = await cloudinary.uploader.upload(
    "./uploads/products/aceclofenac-100.jpg",
    { folder: "test" }
  );

  console.log("SUCCESS ✅");
  console.log(result.secure_url);
};

test().catch(console.error);