// Seed database with real FDA drug data
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import { fetchFDADrugs, transformFDADrugToProduct } from "../services/fdaService.js";

dotenv.config();

const BATCH_SIZE = 50;
const MAX_DRUGS = 500; // Fetch 500 drugs from FDA

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/medicity");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

async function seedFDADrugs() {
  try {
    console.log("\n🏥 Starting FDA Drug Data Seeding...\n");

    // Clear existing products
    const cleared = await Product.deleteMany({});
    console.log(`📭 Cleared ${cleared.deletedCount} existing products\n`);

    let totalSeeded = 0;
    let skipCount = 0;
    const errors = [];

    while (totalSeeded < MAX_DRUGS) {
      try {
        console.log(`📥 Fetching batch from FDA (skip: ${skipCount})...`);
        const fdaDrugs = await fetchFDADrugs({
          skip: skipCount,
          limit: BATCH_SIZE,
        });

        if (!fdaDrugs || fdaDrugs.length === 0) {
          console.log("✅ No more drugs from FDA API");
          break;
        }

        // Transform and filter valid drugs
        const productsToInsert = fdaDrugs
          .map((drug) => transformFDADrugToProduct(drug))
          .filter((product) => product !== null);

        if (productsToInsert.length === 0) {
          console.log("⚠️  No valid products in this batch");
          skipCount += BATCH_SIZE;
          continue;
        }

        // Insert batch
        const inserted = await Product.insertMany(productsToInsert, { ordered: false });
        console.log(`✅ Inserted ${inserted.length} products (Total: ${totalSeeded + inserted.length})`);

        totalSeeded += inserted.length;
        skipCount += BATCH_SIZE;

        // Show progress every 100 drugs
        if (totalSeeded % 100 === 0) {
          console.log(`📊 Progress: ${totalSeeded}/${MAX_DRUGS}`);
        }
      } catch (batchError) {
        console.error(`⚠️  Batch error: ${batchError.message}`);
        errors.push(`Batch at skip=${skipCount}: ${batchError.message}`);
        skipCount += BATCH_SIZE;
      }

      // Add small delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Create database indexes for search performance
    console.log("\n🔍 Creating database indexes...");
    await Product.collection.createIndex({ name: "text", genericName: "text", brand: "text", composition: "text", manufacturer: "text" }, { weights: { name: 10, genericName: 8, brand: 6, composition: 5, manufacturer: 3 }, background: true });
    console.log("✅ Text index created");

    await Product.collection.createIndex({ category: 1, prescriptionRequired: 1, dosageForm: 1, price: 1 }, { background: true });
    console.log("✅ Compound index created");

    // Get statistics
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📊 Seeding Complete!\n");
    console.log(`✅ Total Products Seeded: ${totalSeeded}`);
    console.log("\n📈 Statistics by Category:");
    console.log("────────────────────────────────────────");

    for (const stat of stats) {
      console.log(`${stat._id}`);
      console.log(`  Count: ${stat.count}`);
      console.log(`  Avg Price: ₹${stat.avgPrice.toFixed(2)}`);
      console.log(`  Price Range: ₹${stat.minPrice.toFixed(2)} - ₹${stat.maxPrice.toFixed(2)}`);
    }

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      errors.forEach((error) => console.log(`  - ${error}`));
    }

    console.log("\n✅ FDA Seeding Complete!");
  } catch (error) {
    console.error("❌ Seeding Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB Connection Closed");
  }
}

// Run seeding
connectDB().then(() => seedFDADrugs());
