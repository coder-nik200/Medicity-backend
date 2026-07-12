/**
 * Sample Reviews and Order History Seeding
 * Generates realistic reviews, ratings, and sales history for medicines
 * 
 * Usage: node src/scripts/seedReviewsAndHistory.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

const reviews = [
  "Great quality medicine, fast delivery!",
  "Highly recommended, very effective",
  "Good price, authentic product",
  "Excellent service, will buy again",
  "Works as expected, good packaging",
  "Fast shipping, excellent product quality",
  "Value for money, trusted brand",
  "Perfect, no issues at all",
  "Genuine medicine, reliable seller",
  "Satisfied with purchase",
];

async function updateMedicineMetrics() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("📊 Updating medicine metrics and popularity data...");
    
    // Get all medicines
    const medicines = await Product.find({});
    console.log(`Found ${medicines.length} medicines to update`);

    let updated = 0;
    for (const medicine of medicines) {
      // Realistic sales distribution - some medicines sell more than others
      const totalSold = Math.floor(Math.random() * 2000) + (Math.random() > 0.7 ? 500 : 0);
      
      // Rating based on category - common medicines tend to have higher ratings
      const baseRating = ["Vitamins & Minerals", "Cold & Flu", "Pain Relief"].includes(medicine.category) ? 4.2 : 3.8;
      const rating = Math.min(5, baseRating + (Math.random() * 0.8 - 0.2));
      
      // Review count based on sales
      const reviewCount = Math.floor(totalSold * (0.3 + Math.random() * 0.3));
      
      // Stock should reflect realistic inventory
      const stock = Math.floor(50 + Math.random() * 300);

      await Product.updateOne(
        { _id: medicine._id },
        {
          $set: {
            totalSold,
            rating: parseFloat(rating.toFixed(1)),
            reviewCount,
            stock: stock,
          },
        }
      );
      updated++;

      if (updated % 10 === 0) {
        console.log(`  Updated ${updated}/${medicines.length} medicines`);
      }
    }

    console.log(`✅ Successfully updated ${updated} medicines with metrics!`);

    // Get statistics
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          avgSold: { $avg: "$totalSold" },
          totalStock: { $sum: "$stock" },
          highestRated: { $max: "$rating" },
        },
      },
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log("\n📈 Updated Statistics:");
      console.log(`   Average Rating: ${stat.avgRating.toFixed(2)}/5`);
      console.log(`   Average Sold: ${stat.avgSold.toFixed(0)} units`);
      console.log(`   Total Stock: ${stat.totalStock} units`);
      console.log(`   Highest Rating: ${stat.highestRated.toFixed(1)}`);
    }

    await mongoose.disconnect();
    console.log("\n✨ Metrics update completed successfully!");
  } catch (error) {
    console.error("❌ Update failed:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

updateMedicineMetrics();
