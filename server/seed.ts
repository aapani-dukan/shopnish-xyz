// server/seed.ts

import { db } from "./db";
import { faker } from "@faker-js/faker";
import {
  users,
  sellersPgTable as sellers, // sellersPgTable को sellers के रूप में इम्पोर्ट किया
  categories,
  stores,
  products,
  deliveryBoys,
  orders,
  orderItems,
  cartItems,
  reviews,
  // स्कीमा से सीधे अपेक्षित प्रकारों को इम्पोर्ट करें यदि वे Drizzle के साथ काम करने के लिए विशिष्ट हैं
  // जैसे कि UserRole, ApprovalStatus, ProductApprovalStatusType
  // अगर ये schemas/index.ts में परिभाषित हैं, तो उन्हें यहां से इम्पोर्ट करें
  // मान लें कि schemas में परिभाषित types/enums भी हैं
  UserRole,
  ApprovalStatus,
} from "@/shared/backend/schema"; // पाथ एलियास का उपयोग करें
import { eq } from "drizzle-orm";

async function seedDatabase() {
  try {
    console.log("➡️ Starting database seed...");

    // 1️⃣ Clean existing data (order matters due to foreign keys)
    console.log("🗑️ Cleaning existing data...");
    await db.delete(reviews);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(cartItems);
    await db.delete(products);
    await db.delete(stores);
    await db.delete(sellers);
    await db.delete(deliveryBoys);
    await db.delete(users);
    await db.delete(categories);
    console.log("✅ Existing data cleaned.");


    // 2️⃣ Insert Categories
    console.log("➕ Inserting categories...");
    const insertedCategories = await db.insert(categories).values([
      { name: "Fruits", slug: "fruits", description: "Fresh fruits", image: faker.image.url(), isActive: true, sortOrder: 1 },
      { name: "Vegetables", slug: "vegetables", description: "Fresh veggies", image: faker.image.url(), isActive: true, sortOrder: 2 },
    ]).returning();
    console.log(`✅ Inserted ${insertedCategories.length} categories.`);


    // 3️⃣ Insert Users
    console.log("➕ Inserting users...");
    const userInputs = [
      { firebaseUid: faker.string.uuid(), email: "admin@example.com", name: "Admin", role: "admin" as UserRole, approvalStatus: "approved" as ApprovalStatus },
      { firebaseUid: faker.string.uuid(), email: "customer@example.com", name: "Customer", role: "customer" as UserRole, approvalStatus: "approved" as ApprovalStatus },
      { firebaseUid: faker.string.uuid(), email: "seller@example.com", name: "Seller", role: "seller" as UserRole, approvalStatus: "approved" as ApprovalStatus },
      { firebaseUid: faker.string.uuid(), email: "delivery@example.com", name: "Delivery", role: "delivery_boy" as UserRole, approvalStatus: "approved" as ApprovalStatus },
    ];
    const insertedUsers = await db.insert(users).values(userInputs).returning();
    const sellerUser = insertedUsers.find(u => u.role === "seller");
    const customerUser = insertedUsers.find(u => u.role === "customer");
    const deliveryUser = insertedUsers.find(u => u.role === "delivery_boy");

    if (!sellerUser) throw new Error("❌ Seller user not found.");
    if (!customerUser) throw new Error("❌ Customer user not found.");
    if (!deliveryUser) throw new Error("❌ Delivery user not found.");
    console.log(`✅ Inserted ${insertedUsers.length} users.`);


    // 4️⃣ Insert Seller
    console.log("➕ Inserting seller...");
    const [insertedSeller] = await db.insert(sellers).values({
      userId: sellerUser.id, // Drizzle users table से `id` का उपयोग करें, न कि `firebaseUid`
      businessName: faker.company.name(),
      businessType: "grocery",
      businessAddress: faker.location.streetAddress(),
      city: "Indore",
      pincode: "452001",
      businessPhone: "9876543210",
      approvalStatus: "approved" as ApprovalStatus, // सुनिश्चित करें कि enum type सही है
      gstNumber: "22AAAAA0000A1Z5",
      bankAccountNumber: "1234567890",
      ifscCode: "SBIN0000001",
    }).returning();
    if (!insertedSeller?.id) throw new Error("❌ Seller insert failed! No seller ID returned.");
    console.log("✅ Seller inserted.");


    // 5️⃣ Insert Store for that Seller
    console.log("➕ Inserting store...");
    const [insertedStore] = await db.insert(stores).values({
      sellerId: insertedSeller.id,
      storeName: "My Grocery Store",
      storeType: "grocery",
      address: "123 Main Road",
      city: "Indore",
      pincode: "452001",
      phone: "9999999999",
      isActive: true,
      licenseNumber: "LIC123",
      gstNumber: "22BBBBB0000B1Z6",
    }).returning();

    if (!insertedStore?.id) {
      throw new Error("❌ Store insert failed! No store ID returned.");
    }
    console.log("✅ Store inserted.");


    // 6️⃣ Insert Delivery Boy
    console.log("➕ Inserting delivery boy...");
    await db.insert(deliveryBoys).values({
      userId: deliveryUser.id, // users table से `id` का उपयोग करें
      email: deliveryUser.email!,
      name: deliveryUser.name!,
      vehicleType: "bike",
      approvalStatus: "approved" as ApprovalStatus,
    });
    console.log("✅ Delivery boy inserted.");


    if (!insertedCategories.length) {
      throw new Error("❌ Categories not inserted. Cannot proceed with product insertion.");
    }

    // 7️⃣ Insert Products
    console.log("➕ Inserting products...");
    const insertedProducts = await db.insert(products).values(
      insertedCategories.map(cat => {
        const price = faker.commerce.price({ min: 10, max: 200, dec: 2 }); // ensure decimal places
        const originalPrice = (parseFloat(price) * 1.2).toFixed(2); // String conversion and fixed decimal

        return {
          sellerId: insertedSeller.id,
          storeId: insertedStore.id,
          categoryId: cat.id,
          name: faker.commerce.productName(),
          nameHindi: "हिंदी नाम",
          description: faker.commerce.productDescription(),
          descriptionHindi: "हिंदी विवरण",
          price: price.toString(), // number को string में बदला
          originalPrice: originalPrice.toString(), // number को string में बदला
          image: faker.image.url(),
          images: [faker.image.url(), faker.image.url()], // कम से कम एक अतिरिक्त छवि दें
          unit: "kg",
          stock: 50,
          minOrderQty: 1,
          maxOrderQty: 5,
          isActive: true,
        };
      })
    ).returning();
    console.log(`✅ Inserted ${insertedProducts.length} products.`);


    // 8️⃣ Insert Order
    console.log("➕ Inserting order...");
    const [order] = await db.insert(orders).values({
      customerId: customerUser.id, // users table से `id` का उपयोग करें
      deliveryBoyId: null, // nullable है तो null ठीक है
      orderNumber: "ORD-" + Date.now(),
      subtotal: "0.00", // string के रूप में
      deliveryCharge: "0.00", // string के रूप में
      discount: "0.00", // string के रूप में
      total: "0.00", // string के रूप में
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "placed",
      deliveryAddress: {
        address: "Customer Street",
        city: "Indore",
        pincode: "452001",
      },
    }).returning();
    if (!order?.id) throw new Error("❌ Order insert failed! No order ID returned.");
    console.log("✅ Order inserted.");


    // 9️⃣ Order Items
    console.log("➕ Inserting order items...");
    let totalOrderValue = 0; // कुल ऑर्डर मूल्य के लिए एक नया वेरिएबल
    const items = insertedProducts.slice(0, 2).map(p => { // कुछ ही प्रोडक्ट्स के लिए आइटम बनाएं
      const qty = 2;
      const unitPrice = parseFloat(p.price || "0"); // string price को number में बदलें
      const totalPrice = (unitPrice * qty).toFixed(2); // 2 decimal places और string
      totalOrderValue += parseFloat(totalPrice); // कुल योग में जोड़ें

      return {
        orderId: order.id,
        productId: p.id,
        sellerId: insertedSeller.id,
        quantity: qty,
        unitPrice: unitPrice.toString(), // number को string में बदला
        totalPrice: totalPrice.toString(), // number को string में बदला
      };
    });
    await db.insert(orderItems).values(items);
    await db.update(orders).set({
      subtotal: totalOrderValue.toFixed(2).toString(), // string के रूप में
      total: totalOrderValue.toFixed(2).toString() // string के रूप में
    }).where(eq(orders.id, order.id));
    console.log(`✅ Inserted ${items.length} order items and updated order total.`);


    // 🔟 Reviews
    console.log("➕ Inserting reviews...");
    // सुनिश्चित करें कि ऑर्डर में उत्पाद हैं
    if (insertedProducts.length > 0) {
      await db.insert(reviews).values([
        {
          customerId: customerUser.id,
          productId: insertedProducts[0].id, // पहले प्रोडक्ट के लिए
          orderId: order.id,
          rating: 4,
          comment: "Nice product!",
        },
        {
          customerId: customerUser.id,
          productId: insertedProducts[0].id, // पहले प्रोडक्ट के लिए
          orderId: order.id,
          rating: 5,
          comment: "Excellent quality!",
        }
      ]);
      console.log("✅ Reviews inserted.");
    } else {
      console.log("⚠️ No products to review. Skipping review insertion.");
    }


    // 🔁 Cart Items
    console.log("➕ Inserting cart items...");
    // सिर्फ पहले दो प्रोडक्ट्स के लिए कार्ट आइटम डालें, ताकि बहुत ज्यादा न हों
    await db.insert(cartItems).values(insertedProducts.slice(0, 2).map(p => ({
      userId: customerUser.id,
      productId: p.id,
      quantity: 1,
    })));
    console.log(`✅ Inserted ${insertedProducts.slice(0, 2).length} cart items.`);

    console.log("🎉 Seed complete! Database is populated.");

  } catch (err: any) {
    console.error("❌ Seeding failed:", err.message || err);
    process.exit(1); // Exit with an error code
  }
}

// यह सुनिश्चित करने के लिए कि seedDatabase को कॉल किया गया है, इसे सीधे कॉल करें
seedDatabase();
