/**
 * Imports public FDA Structured Product Label (SPL) records into the local
 * catalogue. Pricing, stock, expiry and product imagery are DEMO commerce data:
 * a regulated pharmacy must replace those fields from its approved supplier/PIM.
 *
 * Usage: npm run import:medicines -- --count=3000
 * Optional: OPENFDA_API_KEY=... (raises the public API rate limit)
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

const BASE_URL = "https://api.fda.gov/drug/label.json";
const requestedCount = Math.max(1, Number(process.argv.find((arg) => arg.startsWith("--count="))?.split("=")[1]) || 2000);
const pageSize = Math.min(1000, Number(process.argv.find((arg) => arg.startsWith("--page-size="))?.split("=")[1]) || 100);
const text = (value) => Array.isArray(value) ? value.join(" ") : value || "";
const short = (value, max = 1200) => text(value).replace(/\s+/g, " ").trim().slice(0, max);
const list = (value, max = 6) => short(value, 1800).split(/(?:\n|;|\.\s+)/).map((entry) => entry.trim()).filter(Boolean).slice(0, max);
const slug = (value) => String(value || "medicine").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function categoryFor(label, dosageForm) {
  const all = `${text(label.purpose)} ${text(label.indications_and_usage)} ${text(label.openfda?.pharm_class_epc)}`.toLowerCase();
  if (/pain|analgesic|anti-inflammatory/.test(all)) return ["Pain Relief", "Pain Relief"];
  if (/diabet|insulin|glucose/.test(all)) return ["Diabetes Care", "Diabetes Care"];
  if (/vitamin|mineral|supplement/.test(all)) return ["Vitamins & Minerals", "Vitamins & Minerals"];
  if (/cold|cough|flu|decongest/.test(all)) return ["Cold & Flu", "Cold & Flu"];
  if (/skin|dermal|topical/.test(all) || /cream|ointment|gel/.test(dosageForm)) return ["Skin Care", "Skin Care"];
  if (/digest|antacid|laxative|nausea/.test(all)) return ["Digestive Care", "Digestive Care"];
  return ["Health Care", "Health Care"];
}

function toProduct(label) {
  const fda = label.openfda || {};
  const genericName = text(fda.generic_name) || short(label.active_ingredient, 160) || text(fda.substance_name) || "Unspecified medicine";
  const brand = text(fda.brand_name) || genericName;
  const dosageForm = text(fda.dosage_form) || "Medicine";
  const [category, specialCategory] = categoryFor(label, dosageForm);
  const sku = `FDA-${label.id || fda.product_ndc?.[0] || slug(`${brand}-${genericName}`)}`.slice(0, 120);
  const price = Number((49 + (Math.abs([...sku].reduce((sum, c) => sum + c.charCodeAt(0), 0)) % 850) + 0.0).toFixed(2));
  const discountPrice = Number((price * 0.9).toFixed(2));
  const prescriptionRequired = fda.product_type?.some((type) => /prescription/i.test(type)) || /rx only|prescription/i.test(`${text(label.warning)} ${text(label.boxed_warning)}`);
  const name = `${brand}${dosageForm ? ` ${dosageForm}` : ""}`.replace(/\s+/g, " ").trim();
  const composition = short(label.active_ingredient, 500) || genericName;
  return {
    name, genericName, brand, brandName: brand, manufacturer: text(fda.manufacturer_name) || text(fda.labeler_name) || "FDA labeler",
    category, specialCategory, composition, strength: text(fda.product_ndc) || undefined, dosageForm,
    description: short(label.description || label.indications_and_usage || label.purpose),
    uses: list(label.indications_and_usage || label.purpose), sideEffects: list(label.adverse_reactions),
    precautions: list(label.warnings || label.warning || label.ask_doctor), warnings: list(label.boxed_warning || label.warnings),
    dosage: short(label.dosage_and_administration || label.directions, 1000), storageInstructions: short(label.storage_and_handling, 500),
    prescriptionRequired, price, discountPrice, costPrice: Number((price * 0.7).toFixed(2)), stock: 15 + (price % 85),
    minStockLevel: 10, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), batchNumber: `DEMO-${sku.slice(-12)}`,
    sku, tags: [category, dosageForm, genericName, brand].filter(Boolean), searchTerms: [name, genericName, brand, composition, text(fda.manufacturer_name)].filter(Boolean),
    image: `https://placehold.co/600x600/e0f2fe/075985?text=${encodeURIComponent("Medicine")}`,
    images: [], source: "openFDA", isActive: true,
  };
}

async function fetchPage(skip) {
  const url = new URL(BASE_URL);
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("skip", String(skip));
  if (process.env.OPENFDA_API_KEY) url.searchParams.set("api_key", process.env.OPENFDA_API_KEY);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`openFDA returned ${response.status}: ${await response.text()}`);
  return response.json();
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  let imported = 0;
  for (let skip = 0; imported < requestedCount; skip += pageSize) {
    const payload = await fetchPage(skip);
    const records = (payload.results || []).slice(0, requestedCount - imported).map(toProduct);
    if (!records.length) break;
    const unique = [...new Map(records.map((record) => [record.sku, record])).values()];
    const result = await Product.bulkWrite(unique.map((record) => ({ updateOne: { filter: { sku: record.sku }, update: { $set: record }, upsert: true } })), { ordered: false });
    imported += unique.length;
    console.log(`Processed ${imported}/${requestedCount} labels (${result.upsertedCount} new, ${result.modifiedCount} updated)`);
  }
  console.log(`Done. Processed ${imported} public label records.`);
  await mongoose.disconnect();
}

run().catch(async (error) => { console.error("Medicine import failed:", error.message); await mongoose.disconnect(); process.exitCode = 1; });
