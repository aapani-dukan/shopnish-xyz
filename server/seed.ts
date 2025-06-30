// server/seed.ts

import { db } from "./db.js";
import { faker } from "@faker-js/faker";
import {
  users,
  sellersPgTable as sellers,
  categories,
  stores,
  products,
  deliveryBoys,
  orders,
  orderItems,
  cartItems,
  reviews,
  userRoleEnum,
  approvalStatusEnum,
} from "@/shared/backend/schema";
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
      { firebaseUid: faker.string.uuid(), email: "admin@example.com", name: "Admin", role: userRoleEnum.enumValues[2], approvalStatus: approvalStatusEnum.enumValues[1] }, // "admin", "approved"
      { firebaseUid: faker.string.uuid(), email: "customer@example.com", name: "Customer", role: userRoleEnum.enumValues[0], approvalStatus: approvalStatusEnum.enumValues[1] }, // "customer", "approved"
      { firebaseUid: faker.string.uuid(), email: "seller@example.com", name: "Seller", role: userRoleEnum.enumValues[1], approvalStatus: approvalStatusEnum.enumValues[1] }, // "seller", "approved"
      { firebaseUid: faker.string.uuid(), email: "delivery@example.com", name: "Delivery", role: userRoleEnum.enumValues[3], approvalStatus: approvalStatusEnum.enumValues[1] }, // "delivery_boy", "approved"
    ];
    const insertedUsers = await db.insert(users).values(userInputs).returning();

    // implicit any type errors for 'u' parameter:
    const sellerUser = insertedUsers.find((u: any) => u.role === userRoleEnum.enumValues[1]); // Type 'any'
    const customerUser = insertedUsers.find((u: any) => u.role === userRoleEnum.enumValues[0]); // Type 'any'
    const deliveryUser = insertedUsers.find((u: any) => u.role === userRoleEnum.enumValues[3]); // Type 'any'


    if (!sellerUser) throw new Error("❌ Seller user not found.");
    if (!customerUser) throw new Error("❌ Customer user not found.");
    if (!deliveryUser) throw new Error("❌ Delivery user not found.");
    console.log(`✅ Inserted ${insertedUsers.length} users.`);


    // 4️⃣ Insert Seller
    console.log("➕ Inserting seller...");
    const [insertedSeller] = await db.insert(sellers).values({
      userId: sellerUser.id, // userId now refers to users.id (integer)
      businessName: faker.company.name(),
      businessType: "grocery",
      businessAddress: faker.location.streetAddress(),
      city: "Indore",
      pincode: "452001",
      businessPhone: "9876543210",
      approvalStatus: approvalStatusEnum.enumValues[1], // "approved"
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
      userId: deliveryUser.id, // userId now refers to users.id (integer)
      email: deliveryUser.email!,
      name: deliveryUser.name!,
      vehicleType: "bike",
      approvalStatus: approvalStatusEnum.enumValues[1], // "approved"
      firebaseUid: deliveryUser.firebaseUid, // Firebase UID भी डालें
    });
    console.log("✅ Delivery boy inserted.");


    if (!insertedCategories.length) {
      throw new Error("❌ Categories not inserted. Cannot proceed with product insertion.");
    }

    // 7️⃣ Insert Products
    console.log("➕ Inserting products...");
    const insertedProducts = await db.insert(products).values(
      insertedCategories.map((cat: any) => { // Type 'any'
        const price = faker.commerce.price({ min: 10, max: 200, dec: 2 });
        const originalPrice = (parseFloat(price) * 1.2).toFixed(2);

        return {
          sellerId: insertedSeller.id,
          storeId: insertedStore.id,
          categoryId: cat.id,
          name: faker.commerce.productName(),
          nameHindi: "हिंदी नाम",
          description: faker.commerce.productDescription(),
          descriptionHindi: "हिंदी विवरण",
          price: price.toString(),
          originalPrice: originalPrice.toString(),
          image: faker.image.url(),
          images: [faker.image.url(), faker.image.url()],
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
      customerId: customerUser.id,
      deliveryBoyId: null,
      orderNumber: "ORD-" + Date.now(),
      subtotal: "0.00",
      deliveryCharge: "0.00",
      discount: "0.00",
      total: "0.00",
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
    let totalOrderValue = 0;
    const items = insertedProducts.slice(0, 2).map((p: any) => { // Type 'any'
      const qty = 2;
      const unitPrice = parseFloat(p.price || "0");
      const totalPrice = (unitPrice * qty).toFixed(2);
      totalOrderValue += parseFloat(totalPrice);

      return {
        orderId: order.id,
        productId: p.id,
        sellerId: insertedSeller.id,
        quantity: qty,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
      };
    });
    await db.insert(orderItems).values(items);
    await db.update(orders).set({
      subtotal: totalOrderValue.toFixed(2).toString(),
      total: totalOrderValue.toFixed(2).toString()
    }).where(eq(orders.id, order.id));
    console.log(`✅ Inserted ${items.length} order items and updated order total.`);


    // 🔟 Reviews
    console.log("➕ Inserting reviews...");
    if (insertedProducts.length > 0) {
      await db.insert(reviews).values([
        {
          customerId: customerUser.id,
          productId: insertedProducts[0].id,
          orderId: order.id,
          rating: 4,
          comment: "Nice product!",
        },
        {
          customerId: customerUser.id,
          productId: insertedProducts[0].id,
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
    await db.insert(cartItems).values(insertedProducts.slice(0, 2).map((p: any) => ({ // Type 'any'
      userId: customerUser.id,
      productId: p.id,
      quantity: 1,
    })));
    console.log(`✅ Inserted ${insertedProducts.slice(0, 2).length} cart items.`);

    console.log("🎉 Seed complete! Database is populated.");

  } catch (err: any) {
    console.error("❌ Seeding failed:", err.message || err);
    process.exit(1);
  }
}

seedDatabase();
