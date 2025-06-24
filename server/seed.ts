import { db } from "./db";
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
} from "@shared/backend/schema";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  try {
    // 1️⃣ Clean existing data (order matters)
    // Pehle reviews delete karo taaki foreign key error na aaye
await db.delete(reviews);   

// Baaki tables delete karo
await db.delete(orderItems);
await db.delete(orders);
await db.delete(cartItems);
await db.delete(products);
await db.delete(stores);
await db.delete(sellers);
await db.delete(deliveryBoys);
await db.delete(users);
await db.delete(categories);





    // 2️⃣ Insert Categories
    const insertedCategories = await db.insert(categories).values([
      { name: "Fruits", slug: "fruits", description: "Fresh fruits", image: faker.image.url(), isActive: true, sortOrder: 1 },
      { name: "Vegetables", slug: "vegetables", description: "Fresh veggies", image: faker.image.url(), isActive: true, sortOrder: 2 },
    ]).returning();

    // 3️⃣ Insert Users
    const userInputs = [
      { firebaseUid: faker.string.uuid(), email: "admin@example.com", name: "Admin", role: "admin", approvalStatus: "approved" },
      { firebaseUid: faker.string.uuid(), email: "customer@example.com", name: "Customer", role: "customer", approvalStatus: "approved" },
      { firebaseUid: faker.string.uuid(), email: "seller@example.com", name: "Seller", role: "seller", approvalStatus: "approved" },
      { firebaseUid: faker.string.uuid(), email: "delivery@example.com", name: "Delivery", role: "delivery_boy", approvalStatus: "approved" },
    ];
    const insertedUsers = await db.insert(users).values(userInputs).returning();
    const sellerUser = insertedUsers.find(u => u.role === "seller")!;
    const customerUser = insertedUsers.find(u => u.role === "customer")!;
    const deliveryUser = insertedUsers.find(u => u.role === "delivery_boy")!;

    // 4️⃣ Insert Seller
    const [insertedSeller] = await db.insert(sellers).values({
      userId: sellerUser.firebaseUid,
      businessName: faker.company.name(),
      businessType: "grocery",
      businessAddress: faker.location.streetAddress(),
      city: "Indore",
      pincode: "452001",
      businessPhone: "9876543210",
      approvalStatus: "approved",
      gstNumber: "22AAAAA0000A1Z5",
      bankAccountNumber: "1234567890",
      ifscCode: "SBIN0000001",
    }).returning();
// 5️⃣ Insert Store for that Seller
const storeResult = await db.insert(stores).values({
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

const insertedStore = storeResult[0];

if (!insertedStore?.id) {
  throw new Error("❌ Store insert failed! No store ID returned.");
}


    // 6️⃣ Insert Delivery Boy
    await db.insert(deliveryBoys).values({
      firebaseUid: deliveryUser.firebaseUid,
      email: deliveryUser.email!,
      name: deliveryUser.name!,
      vehicleType: "bike",
      approvalStatus: "approved",
    });


if (!insertedStore?.id) {
  throw new Error("❌ Store not inserted properly. Store ID is missing.");
}
if (!insertedCategories.length) {
  throw new Error("❌ Categories not inserted. Cannot proceed with product insertion.");
}

// 7️⃣ Insert Products
const insertedProducts = await db.insert(products).values(
  insertedCategories.map(cat => {
    const price = +faker.commerce.price({ min: 10, max: 200 });

    return {
      sellerId: insertedSeller.id,
      storeId: insertedStore.id, // ✅ now guaranteed
      categoryId: cat.id,
      name: faker.commerce.productName(),
      nameHindi: "हिंदी नाम",
      description: faker.commerce.productDescription(),
      descriptionHindi: "हिंदी विवरण",
      price,
      originalPrice: price * 1.2,
      image: faker.image.url(),
      images: [faker.image.url()],
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
    const [order] = await db.insert(orders).values({
      customerId: customerUser.id,
      deliveryBoyId: null,
      orderNumber: "ORD-" + Date.now(),
      subtotal: 0,
      deliveryCharge: "0",
      discount: "0",
      total: 0,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "placed",
      deliveryAddress: {
        address: "Customer Street",
        city: "Indore",
        pincode: "452001",
      },
    }).returning();

    // 9️⃣ Order Items
    let total = 0;
    const items = insertedProducts.map(p => {
      const qty = 2;
      const unitPrice = +p.price;
      const totalPrice = unitPrice * qty;
      total += totalPrice;
      return {
        orderId: order.id,
        productId: p.id,
        sellerId: insertedSeller.id,
        quantity: qty,
        unitPrice,
        totalPrice,
      };
    });
    await db.insert(orderItems).values(items);
    await db.update(orders).set({ subtotal: total, total }).where(eq(orders.id, order.id));

    // 🔟 Reviews
    await db.insert(reviews).values(insertedProducts.map(p => ({
      customerId: customerUser.id,
      productId: p.id,
      orderId: order.id,
      rating: 4,
      comment: "Nice product!",
    })));

    // 🔁 Cart Items
    await db.insert(cartItems).values(insertedProducts.map(p => ({
      userId: customerUser.id,
      productId: p.id,
      quantity: 1,
    })));

    console.log("✅ Seed complete!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

seedDatabase();

