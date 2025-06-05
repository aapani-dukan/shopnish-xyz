import { db } from "./db";
import { categories, products, users, stores } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Check if data already exists
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length > 0) {
      console.log("Database already seeded");
      return;
    }

    // 👇 ये लाइनें table को create कर देंगी अगर वो exist नहीं करती
await db.execute(`
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL
  );
`);
    // Create categories for daily essentials
    const categoryData = [
      {
        name: "Cooking Oils & Ghee",
        nameHindi: "खाना पकाने का तेल और घी",
        slug: "cooking-oils",
        description: "Essential cooking oils, ghee, and butter",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Rice & Grains",
        nameHindi: "चावल और अनाज",
        slug: "rice-grains",
        description: "All types of rice, wheat, and grains",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Pulses & Lentils",
        nameHindi: "दाल और दलहन",
        slug: "pulses-lentils",
        description: "Various types of dal and pulses",
        image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b",
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Spices & Masala",
        nameHindi: "मसाले",
        slug: "spices-masala",
        description: "Essential Indian spices and masalas",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Tea, Coffee & Beverages",
        nameHindi: "चाय, कॉफी और पेय",
        slug: "tea-coffee",
        description: "Tea, coffee, and other beverages",
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574",
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Sugar & Salt",
        nameHindi: "चीनी और नमक",
        slug: "sugar-salt",
        description: "Sugar, salt, and sweeteners",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Soap & Personal Care",
        nameHindi: "साबुन और व्यक्तिगत देखभाल",
        slug: "soap-personal-care",
        description: "Bath soaps, personal hygiene products",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03",
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Cleaning & Household",
        nameHindi: "सफाई और घरेलू सामान",
        slug: "cleaning-household",
        description: "Cleaning products and household items",
        image: "https://images.unsplash.com/photo-1563453392212-326f5e854473",
        isActive: true,
        sortOrder: 8,
      },
      {
        name: "Fresh Vegetables",
        nameHindi: "ताज़ी सब्जियां",
        slug: "fresh-vegetables",
        description: "Daily fresh vegetables",
        image: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d",
        isActive: true,
        sortOrder: 9,
      },
      {
        name: "Fresh Fruits",
        nameHindi: "ताज़े फल",
        slug: "fresh-fruits",
        description: "Seasonal fresh fruits",
        image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf",
        isActive: true,
        sortOrder: 10,
      }
    ];

    // Insert categories
    const insertedCategories = await db.insert(categories).values(categoryData).returning();
    console.log(`Inserted ${insertedCategories.length} categories`);

    // Create multiple seller users for different stores in Jaipur
    const sellers = [
      {
        email: "raj.kumar@shopnish.com",
        password: "password123",
        firstName: "Raj",
        lastName: "Kumar",
        phone: "9876543210",
        role: "seller",
        address: "Shop No. 15, Main Market",
        city: "Jaipur",
        pincode: "302001",
        isActive: true,
      },
      {
        email: "priya.sharma@shopnish.com",
        password: "password123",
        firstName: "Priya",
        lastName: "Sharma",
        phone: "9876543211",
        role: "seller",
        address: "Shop No. 8, Johari Bazaar",
        city: "Jaipur",
        pincode: "302003",
        isActive: true,
      },
      {
        email: "amit.gupta@shopnish.com",
        password: "password123",
        firstName: "Amit",
        lastName: "Gupta",
        phone: "9876543212",
        role: "seller",
        address: "Shop No. 25, MI Road",
        city: "Jaipur",
        pincode: "302001",
        isActive: true,
      }
    ];

    const insertedSellers = await db.insert(users).values(sellers).returning();

    // Create multiple stores
    const storeData = [
      {
        sellerId: insertedSellers[0].id,
        storeName: "Kumar General Store",
        storeType: "grocery",
        address: "Shop No. 15, Main Market, Pink City",
        city: "Jaipur",
        pincode: "302001",
        phone: "9876543210",
        isActive: true,
        licenseNumber: "RAJ-GRO-2024-001",
        gstNumber: "08ABCDE1234F1Z5",
        openTime: "07:00",
        closeTime: "22:00",
      },
      {
        sellerId: insertedSellers[1].id,
        storeName: "Sharma Fresh Mart",
        storeType: "grocery",
        address: "Shop No. 8, Johari Bazaar, Old City",
        city: "Jaipur",
        pincode: "302003",
        phone: "9876543211",
        isActive: true,
        licenseNumber: "RAJ-GRO-2024-002",
        gstNumber: "08ABCDE1234F2Z6",
        openTime: "06:30",
        closeTime: "23:00",
      },
      {
        sellerId: insertedSellers[2].id,
        storeName: "Gupta Organics",
        storeType: "organic",
        address: "Shop No. 25, MI Road, C-Scheme",
        city: "Jaipur",
        pincode: "302001",
        phone: "9876543212",
        isActive: true,
        licenseNumber: "RAJ-ORG-2024-003",
        gstNumber: "08ABCDE1234F3Z7",
        openTime: "08:00",
        closeTime: "21:00",
      }
    ];

    const insertedStores = await db.insert(stores).values(storeData).returning();

    // Create sample products distributed across multiple stores
    const productData = [
      // Kumar General Store Products
      {
        sellerId: insertedSellers[0].id,
        storeId: insertedStores[0].id,
        categoryId: insertedCategories[0].id,
        name: "Fortune Sunflower Oil",
        nameHindi: "फॉर्च्यून सूरजमुखी तेल",
        description: "Pure sunflower oil for healthy cooking",
        descriptionHindi: "स्वस्थ खाना पकाने के लिए शुद्ध सूरजमुखी तेल",
        price: "185.00",
        originalPrice: "195.00",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
        images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5"],
        unit: "1L",
        brand: "Fortune",
        stock: 50,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      },
      // More products for Kumar General Store
      {
        sellerId: insertedSellers[0].id,
        storeId: insertedStores[0].id,
        categoryId: insertedCategories[0].id,
        name: "Amul Pure Ghee",
        nameHindi: "अमूल शुद्ध घी",
        description: "Pure cow ghee for traditional cooking",
        descriptionHindi: "पारंपरिक खाना पकाने के लिए शुद्ध गाय का घी",
        price: "275.00",
        image: "https://images.unsplash.com/photo-1628288506630-024db3db8216",
        images: ["https://images.unsplash.com/photo-1628288506630-024db3db8216"],
        unit: "500ml",
        brand: "Amul",
        stock: 30,
        minOrderQty: 1,
        maxOrderQty: 3,
        isActive: true,
      },
      {
        sellerId: insertedSellers[0].id,
        storeId: insertedStores[0].id,
        categoryId: insertedCategories[1].id,
        name: "India Gate Basmati Rice",
        nameHindi: "इंडिया गेट बासमती चावल",
        description: "Premium quality basmati rice",
        descriptionHindi: "प्रीमियम गुणवत्ता बासमती चावल",
        price: "145.00",
        originalPrice: "155.00",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
        images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c"],
        unit: "1kg",
        brand: "India Gate",
        stock: 100,
        minOrderQty: 1,
        maxOrderQty: 10,
        isActive: true,
      },
      {
        sellerId: insertedSellers[0].id,
        storeId: insertedStores[0].id,
        categoryId: insertedCategories[2].id,
        name: "Toor Dal",
        nameHindi: "तूर दाल",
        description: "High quality yellow pigeon peas",
        descriptionHindi: "उच्च गुणवत्ता वाली पीली अरहर दाल",
        price: "85.00",
        image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b",
        images: ["https://images.unsplash.com/photo-1559181567-c3190ca9959b"],
        unit: "1kg",
        brand: "Premium",
        stock: 60,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      },

      // Sharma Fresh Mart Products (Different pricing & specialty items)
      {
        sellerId: insertedSellers[1].id,
        storeId: insertedStores[1].id,
        categoryId: insertedCategories[0].id,
        name: "Dhara Mustard Oil",
        nameHindi: "धारा सरसों का तेल",
        description: "Pure mustard oil for authentic cooking",
        descriptionHindi: "प्रामाणिक खाना पकाने के लिए शुद्ध सरसों का तेल",
        price: "165.00",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
        images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5"],
        unit: "1L",
        brand: "Dhara",
        stock: 40,
        minOrderQty: 1,
        maxOrderQty: 4,
        isActive: true,
      },
      {
        sellerId: insertedSellers[1].id,
        storeId: insertedStores[1].id,
        categoryId: insertedCategories[1].id,
        name: "Whole Wheat Flour",
        nameHindi: "पूरे गेहूं का आटा",
        description: "Fresh ground whole wheat flour",
        descriptionHindi: "ताजा पिसा हुआ पूरे गेहूं का आटा",
        price: "42.00",
        image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b",
        images: ["https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b"],
        unit: "1kg",
        brand: "Chakki Fresh",
        stock: 80,
        minOrderQty: 1,
        maxOrderQty: 20,
        isActive: true,
      },
      {
        sellerId: insertedSellers[1].id,
        storeId: insertedStores[1].id,
        categoryId: insertedCategories[8].id,
        name: "Fresh Onions",
        nameHindi: "ताज़ा प्याज",
        description: "Daily fresh red onions",
        descriptionHindi: "दैनिक ताज़ा लाल प्याज",
        price: "26.00",
        image: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d",
        images: ["https://images.unsplash.com/photo-1590779033100-9f60a05a013d"],
        unit: "1kg",
        brand: "Farm Direct",
        stock: 60,
        minOrderQty: 1,
        maxOrderQty: 15,
        isActive: true,
      },
      {
        sellerId: insertedSellers[1].id,
        storeId: insertedStores[1].id,
        categoryId: insertedCategories[8].id,
        name: "Fresh Tomatoes",
        nameHindi: "ताज़े टमाटर",
        description: "Ripe red tomatoes",
        descriptionHindi: "पके हुए लाल टमाटर",
        price: "32.00",
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337",
        images: ["https://images.unsplash.com/photo-1546094096-0df4bcaaa337"],
        unit: "1kg",
        brand: "Farm Direct",
        stock: 50,
        minOrderQty: 1,
        maxOrderQty: 10,
        isActive: true,
      },

      // Gupta Organics Products (Premium organic items)
      {
        sellerId: insertedSellers[2].id,
        storeId: insertedStores[2].id,
        categoryId: insertedCategories[0].id,
        name: "Organic Coconut Oil",
        nameHindi: "जैविक नारियल तेल",
        description: "Cold-pressed organic coconut oil",
        descriptionHindi: "कोल्ड-प्रेस्ड जैविक नारियल तेल",
        price: "320.00",
        originalPrice: "350.00",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
        images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5"],
        unit: "500ml",
        brand: "Organic India",
        stock: 25,
        minOrderQty: 1,
        maxOrderQty: 3,
        isActive: true,
      },
      {
        sellerId: insertedSellers[2].id,
        storeId: insertedStores[2].id,
        categoryId: insertedCategories[1].id,
        name: "Organic Brown Rice",
        nameHindi: "जैविक भूरा चावल",
        description: "Nutritious organic brown rice",
        descriptionHindi: "पोषक जैविक भूरा चावल",
        price: "180.00",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
        images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c"],
        unit: "1kg",
        brand: "Organic Valley",
        stock: 35,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      },
      {
        sellerId: insertedSellers[2].id,
        storeId: insertedStores[2].id,
        categoryId: insertedCategories[2].id,
        name: "Organic Moong Dal",
        nameHindi: "जैविक मूंग दाल",
        description: "Pesticide-free organic moong dal",
        descriptionHindi: "कीटनाशक-मुक्त जैविक मूंग दाल",
        price: "125.00",
        image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b",
        images: ["https://images.unsplash.com/photo-1559181567-c3190ca9959b"],
        unit: "1kg",
        brand: "Organic Harvest",
        stock: 30,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      },
      {
        sellerId: insertedSellers[2].id,
        storeId: insertedStores[2].id,
        categoryId: insertedCategories[9].id,
        name: "Organic Bananas",
        nameHindi: "जैविक केले",
        description: "Chemical-free organic bananas",
        descriptionHindi: "रसायन-मुक्त जैविक केले",
        price: "65.00",
        image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf",
        images: ["https://images.unsplash.com/photo-1610832958506-aa56368176cf"],
        unit: "1 dozen",
        brand: "Organic Farms",
        stock: 20,
        minOrderQty: 1,
        maxOrderQty: 3,
        isActive: true,
      },

      // Common items across all stores with different pricing
      {
        sellerId: insertedSellers[0].id,
        storeId: insertedStores[0].id,
        categoryId: insertedCategories[4].id,
        name: "Tata Tea Gold",
        nameHindi: "टाटा टी गोल्ड",
        description: "Premium quality black tea",
        descriptionHindi: "प्रीमियम गुणवत्ता काली चाय",
        price: "155.00",
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574",
        images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574"],
        unit: "500g",
        brand: "Tata",
        stock: 35,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      },
      {
        sellerId: insertedSellers[1].id,
        storeId: insertedStores[1].id,
        categoryId: insertedCategories[4].id,
        name: "Tata Tea Gold",
        nameHindi: "टाटा टी गोल्ड",
        description: "Premium quality black tea",
        descriptionHindi: "प्रीमियम गुणवत्ता काली चाय",
        price: "150.00",
        originalPrice: "160.00",
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574",
        images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574"],
        unit: "500g",
        brand: "Tata",
        stock: 45,
        minOrderQty: 1,
        maxOrderQty: 5,
        isActive: true,
      }
    ];

    // Insert products
    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log(`Inserted ${insertedProducts.length} products`);

    // Create delivery boy users
    const deliveryBoys = [
      {
        email: "ravi.delivery@shopnish.com",
        password: "delivery123",
        firstName: "Ravi",
        lastName: "Singh",
        phone: "9876543213",
        role: "delivery_boy",
        address: "Sector 12, Malviya Nagar",
        city: "Jaipur",
        pincode: "302017",
        isActive: true,
      },
      {
        email: "suresh.delivery@shopnish.com",
        password: "delivery123",
        firstName: "Suresh",
        lastName: "Sharma",
        phone: "9876543214",
        role: "delivery_boy",
        address: "C-Scheme, MI Road",
        city: "Jaipur",
        pincode: "302001",
        isActive: true,
      },
      {
        email: "rakesh.delivery@shopnish.com",
        password: "delivery123",
        firstName: "Rakesh",
        lastName: "Meena",
        phone: "9876543215",
        role: "delivery_boy",
        address: "Bani Park, Gopinath Marg",
        city: "Jaipur",
        pincode: "302016",
        isActive: true,
      }
    ];

    const insertedDeliveryBoys = await db.insert(users).values(deliveryBoys).returning();
    console.log(`Inserted ${insertedDeliveryBoys.length} delivery boys`);

    console.log("Database seeded successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
