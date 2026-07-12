import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB ✅");
    const ADMIN_NAME = process.env.ADMIN_NAME || "Pharmacy Admin";
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@pharmacy.com";
    const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

    // check if admin with the same email already exists
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    if (adminExists) {
      console.log("❌ Admin already exists with that email");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASS, 10);

    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    console.log(`✅ Admin created successfully: ${ADMIN_EMAIL}`);
    console.log("Note: keep the credentials safe and change the password after first login.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();

// Command To Create Admin Successfully Only Once.

// node src/scripts/createAdmin.js

// If we are trying it for second time we got admin already exists.
