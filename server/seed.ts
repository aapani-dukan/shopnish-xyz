import { db } from "./db";
import { categories, users, stores, products } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");

    // Optional table creation for dev/testing
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_hindi TEXT,
        slug TEXT UNIQUE,
        description TEXT,
        image TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER
      );
    `);

    // Check if already seeded
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length > 0) {
      console.log("✅ Database already seeded.");
      return;
    }

    // ✅ Cleaned category data (with consistent keys and no duplicates)
    const categoryData = [
      {
        name: "Cooking Oils & Ghee",
        name_hindi: "खाना पकाने का तेल और घी",
        slug: "cooking-oils",
        description: "Essential cooking oils, ghee, and butter",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
        is_active: true,
        sort_order: 1,
      },
      {
        name: "Rice & Grains",
        name_hindi: "चावल और अनाज",
        slug: "rice-grains",
        description: "All types of rice, wheat, and grains",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
        is_active: true,
        sort_order: 2,
      },
      {
        name: "Snacks & Namkeen",
        name_hindi: "नमकीन और स्नैक्स",
        slug: "snacks-namkeen",
        description: "Delicious snacks and namkeen items",
        image: "https://images.unsplash.com/photo-1601315379701-1564147c58b4",
        is_active: true,
        sort_order: 3,
      },
      {
        name: "Personal Care",
        name_hindi: "व्यक्तिगत देखभाल",
        slug: "personal-care",
        description: "Shampoos, soaps, creams, etc.",
        image: "https://images.unsplash.com/photo-1611080626919-7e2c3a6baf4b",
        is_active: true,
        sort_order: 4,
      },
      {
        name: "Pulses & Lentils",
        name_hindi: "दाल और दलहन",
        slug: "pulses-lentils",
        description: "Various types of dal and pulses",
        image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b",
        is_active: true,
        sort_order: 5,
      },
      {
        name: "Spices & Masala",
        name_hindi: "मसाले",
        slug: "spices-masala",
        description: "Essential Indian spices and masalas",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        is_active: true,
        sort_order: 6,
      },
      {
        name: "Tea, Coffee & Beverages",
        name_hindi: "चाय, कॉफी और पेय",
        slug: "tea-coffee",
        description: "Tea, coffee, and other beverages",
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574",
        is_active: true,
        sort_order: 7,
      },
      {
        name: "Sugar & Salt",
        name_hindi: "चीनी और नमक",
        slug: "sugar-salt",
        description: "Sugar, salt, and sweeteners",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        is_active: true,
        sort_order: 8,
      },
      {
        name: "Soap & Hygiene",
        name_hindi: "साबुन और स्वच्छता",
        slug: "soap-hygiene",
        description: "Bath soaps, personal hygiene products",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03",
        is_active: true,
        sort_order: 9,
      },
      {
        name: "Cleaning & Household",
        name_hindi: "सफाई और घरेलू सामान",
        slug: "cleaning-household",
        description: "Cleaning products and household items",
        image: "https://images.unsplash.com/photo-1563453392212-326f5e854473",
        is_active: true,
        sort_order: 10,
      },
      {
        name: "Fresh Vegetables",
        name_hindi: "ताज़ी सब्जियां",
        slug: "fresh-vegetables",
        description: "Daily fresh vegetables",
        image: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d",
        is_active: true,
        sort_order: 11,
      },
      {
        name: "Fresh Fruits",
        name_hindi: "ताज़े फल",
        slug: "fresh-fruits",
        description: "Seasonal fresh fruits",
        image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf",
        is_active: true,
        sort_order: 12,
      },
    ];

    const insertedCategories = await db.insert(categories).values(categoryData).returning();
    console.log(`✅ Inserted ${insertedCategories.length} categories`);

    // अब आप यहां से sellers, stores और products को insert कर सकते हैं जैसे आप पहले कर रहे थे
    // लेकिन कृपया ensure करें कि:
    // - `users` और `stores` table exist करते हों
    // - उनके स्कीमा के अनुसार आप values दे रहे हों
    // - सभी inserts `await` के साथ await करें, और errors को try-catch में handle करें

  } catch (error) {
    console.error("❌ Failed to seed database:", error);
  }
}
