var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/backend/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cartItems: () => cartItems,
  categories: () => categories,
  deliveryAreas: () => deliveryAreas,
  deliveryBoys: () => deliveryBoys,
  insertCartItemSchema: () => insertCartItemSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertDeliveryAreaSchema: () => insertDeliveryAreaSchema,
  insertDeliveryBoySchema: () => insertDeliveryBoySchema,
  insertOrderItemSchema: () => insertOrderItemSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertOrderTrackingSchema: () => insertOrderTrackingSchema,
  insertProductSchema: () => insertProductSchema,
  insertPromoCodeSchema: () => insertPromoCodeSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertSellerApplicationSchema: () => insertSellerApplicationSchema,
  insertSellerSchema: () => insertSellerSchema,
  insertServiceBookingSchema: () => insertServiceBookingSchema,
  insertServiceCategorySchema: () => insertServiceCategorySchema,
  insertServiceProviderSchema: () => insertServiceProviderSchema,
  insertServiceSchema: () => insertServiceSchema,
  insertStoreSchema: () => insertStoreSchema,
  insertUserSchema: () => insertUserSchema,
  orderItems: () => orderItems,
  orderTracking: () => orderTracking,
  orders: () => orders,
  products: () => products,
  promoCodes: () => promoCodes,
  reviews: () => reviews,
  sellerApplications: () => sellerApplications2,
  sellers: () => sellers,
  serviceBookings: () => serviceBookings,
  serviceCategories: () => serviceCategories,
  serviceProviders: () => serviceProviders,
  services: () => services,
  stores: () => stores,
  users: () => users
});
import { pgTable, text, serial, integer, decimal, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sellers = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  // यह 'users' टेबल के 'id' से रेफरेंस होना चाहिए अगर यह DB से है
  businessName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
  approvedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
var sellerApplications2 = pgTable("seller_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  businessName: text("business_name").notNull(),
  gstNumber: text("gst_number"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  approvalStatus: varchar("approval_status", {
    enum: ["pending", "approved", "rejected"]
  }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(),
  // ✅ Firebase UID यहाँ जोड़ें
  email: text("email").notNull().unique(),
  // password: text("password").notNull(), // ✅ यदि आप Firebase Auth का उपयोग कर रहे हैं तो इसकी आवश्यकता नहीं है
  name: text("name"),
  // ✅ यूज़र का नाम यहाँ जोड़ें
  firstName: text("first_name"),
  // इसे optional या हटा सकते हैं यदि 'name' ही काफी है
  lastName: text("last_name"),
  // इसे optional या हटा सकते हैं
  phone: text("phone"),
  // इसे optional या हटा सकते हैं
  role: varchar("role", { enum: ["customer", "seller", "admin", "delivery_boy"] }).notNull().default("customer"),
  // ✅ varchar और enum का उपयोग करें
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("approved"),
  // ✅ अप्रूवल स्टेटस जोड़ें
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id),
  storeName: text("store_name").notNull(),
  storeType: text("store_type").notNull(),
  // grocery, pharmacy, general, etc.
  address: text("address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  phone: text("phone").notNull(),
  isActive: boolean("is_active").default(true),
  licenseNumber: text("license_number"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertSellerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
  role: z.literal("seller").default("seller")
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0)
});
var products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id),
  storeId: integer("store_id").references(() => stores.id),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  description: text("description"),
  descriptionHindi: text("description_hindi"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image").notNull(),
  images: text("images").array(),
  unit: text("unit").notNull().default("piece"),
  // kg, liter, piece, etc.
  brand: text("brand"),
  stock: integer("stock").notNull().default(0),
  minOrderQty: integer("min_order_qty").default(1),
  maxOrderQty: integer("max_order_qty").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var deliveryAreas = pgTable("delivery_areas", {
  id: serial("id").primaryKey(),
  areaName: text("area_name").notNull(),
  pincode: text("pincode").notNull(),
  city: text("city").notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).notNull(),
  freeDeliveryAbove: decimal("free_delivery_above", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true)
});
var deliveryBoys = pgTable("delivery_boys", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique().notNull(),
  // ✅ Firebase UID यहाँ जोड़ें
  email: text("email").unique().notNull(),
  // ✅ ईमेल यहाँ जोड़ें
  name: text("name"),
  // ✅ नाम यहाँ जोड़ें
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  // ✅ अप्रूवल स्टेटस यहाँ जोड़ें
  // userId: integer("user_id").references(() => users.id), // ✅ इसे हटा दें या optional करें यदि आप Firebase UID से सीधे लिंक कर रहे हैं
  vehicleType: text("vehicle_type").notNull(),
  // bike, cycle, auto
  vehicleNumber: text("vehicle_number"),
  licenseNumber: text("license_number"),
  aadharNumber: text("aadhar_number"),
  isAvailable: boolean("is_available").default(true),
  currentLat: decimal("current_lat", { precision: 10, scale: 8 }),
  currentLng: decimal("current_lng", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalDeliveries: integer("total_deliveries").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  deliveryBoyId: integer("delivery_boy_id").references(() => deliveryBoys.id),
  orderNumber: text("order_number").notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  // cod, online, upi
  paymentStatus: text("payment_status").default("pending"),
  // pending, paid, failed
  status: text("status").notNull().default("placed"),
  // placed, confirmed, packed, out_for_delivery, delivered, cancelled
  deliveryAddress: json("delivery_address").notNull(),
  deliveryInstructions: text("delivery_instructions"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  promoCode: text("promo_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  sellerId: integer("seller_id").references(() => users.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull()
});
var orderTracking = pgTable("order_tracking", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  status: text("status").notNull(),
  message: text("message"),
  messageHindi: text("message_hindi"),
  location: text("location"),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(),
  // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true)
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  // in minutes
  isActive: boolean("is_active").default(true)
});
var serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  experience: text("experience"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalJobs: integer("total_jobs").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var serviceBookings = pgTable("service_bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  serviceProviderId: integer("service_provider_id").references(() => serviceProviders.id),
  serviceId: integer("service_id").references(() => services.id),
  bookingNumber: text("booking_number").notNull().unique(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  address: json("address").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  // pending, confirmed, in_progress, completed, cancelled
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  customerNotes: text("customer_notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  // ✅ सब optional कर दिया
  role: true,
  approvalStatus: true
}).required({
  // ✅ सिर्फ ज़रूरी fields पक्की रखीं
  firebaseUid: true,
  email: true,
  name: true
});
var insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true
});
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDeliveryAreaSchema = createInsertSchema(deliveryAreas).omit({
  id: true
});
var insertDeliveryBoySchema = createInsertSchema(deliveryBoys).omit({
  id: true,
  createdAt: true
  // userId: true, // यदि आप इसे हटा रहे हैं तो यहाँ भी omit करें
});
var insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true
});
var insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true
});
var insertOrderTrackingSchema = createInsertSchema(orderTracking).omit({
  id: true,
  createdAt: true
});
var insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true
});
var insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true
});
var insertServiceSchema = createInsertSchema(services).omit({
  id: true
});
var insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true
});
var insertServiceBookingSchema = createInsertSchema(serviceBookings).omit({
  id: true,
  createdAt: true
});
var insertSellerApplicationSchema = createInsertSchema(sellerApplications2).omit({
  id: true,
  createdAt: true
});
var insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (Render \u2192 Environment Vars)");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
  // Render पर SSL ऑन रहता है
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
var sellers2 = [
  {
    id: "1",
    name: "Test Seller",
    approvalStatus: "pending",
    appliedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var DatabaseStorage = class {
  // Authentication & Users
  async getUserByEmail(email) {
    try {
      const result = await db.select().from(users);
      return result.find((u) => u.email === email);
    } catch (error) {
      console.error("Error getting user by email:", error);
      return void 0;
    }
  }
  async getUserById(id) {
    try {
      const result = await db.select().from(users);
      return result.find((u) => u.id === id);
    } catch (error) {
      console.error("Error getting user by id:", error);
      return void 0;
    }
  }
  async getSellers(filters) {
    const sellersList = await db.select().from(sellers2);
    if (filters?.approvalStatus) {
      return sellersList.filter((s) => s.approvalStatus === filters.approvalStatus);
    }
    return sellersList;
  }
  async getUserByFirebaseUid(firebaseUid) {
    try {
      const result = await db.select().from(users);
      return result.find((u) => u.firebaseUid === firebaseUid);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      return void 0;
    }
  }
  async createUser(user) {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  // Categories
  async getCategories() {
    try {
      const result = await db.select().from(categories);
      return result.filter((c) => c.isActive);
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }
  async getCategory(id) {
    try {
      const result = await db.select().from(categories);
      return result.find((c) => c.id === id);
    } catch (error) {
      console.error("Error getting category:", error);
      return void 0;
    }
  }
  async createCategory(category) {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }
  // ------------ Seller Application -------------
  async getSellerApplicationByUserId(userId) {
    const rows = await db.select().from(sellerApplications).where(eq(sellerApplications.userId, userId));
    return rows[0];
  }
  async createSellerApplication(data) {
    const [row] = await db.insert(sellerApplications).values(data).returning();
    return row;
  }
  // Products
  async getProducts(filters) {
    try {
      const result = await db.select().from(products);
      let filtered = result.filter((p) => p.isActive);
      if (filters?.categoryId) {
        filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (p) => p.name?.toLowerCase().includes(searchLower) || p.nameHindi?.toLowerCase().includes(searchLower) || p.description?.toLowerCase().includes(searchLower)
        );
      }
      return filtered;
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }
  async getProduct(id) {
    try {
      const result = await db.select().from(products);
      return result.find((p) => p.id === id);
    } catch (error) {
      console.error("Error getting product:", error);
      return void 0;
    }
  }
  async createProduct(product) {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }
  // ...आपके existing methods के नीचे नीचे 👇 ये जोड़ें
  // -------------------- CART WRAPPERS --------------------
  async getCartItemsByUserId(userId) {
    return this.getCartItems(userId);
  }
  async addCartItem(item) {
    return this.addToCart(item);
  }
  async updateCartItemQuantity(id, _userId, quantity) {
    return this.updateCartItem(id, quantity);
  }
  async removeCartItem(id, _userId) {
    return this.removeFromCart(id);
  }
  // ------------------ DELIVERY BOY METHODS ------------------
  async getDeliveryBoyByEmail(email) {
    const list = await db.select().from(deliveryBoys);
    return list.find((b) => b.email === email);
  }
  async getDeliveryBoyByFirebaseUid(firebaseUid) {
    const list = await db.select().from(deliveryBoys);
    return list.find((b) => b.firebaseUid === firebaseUid);
  }
  async createDeliveryBoy(data) {
    const result = await db.insert(deliveryBoys).values(data).returning();
    return result[0];
  }
  // --------------- createOrder OVERLOAD (Optional items) ---------------
  async createOrder(order, items = []) {
    const orderResult = await db.insert(orders).values(order).returning();
    const newOrder = orderResult[0];
    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });
    }
    return newOrder;
  }
  // Shopping Cart
  async getCartItems(userId, sessionId) {
    try {
      const cartResult = await db.select().from(cartItems);
      const productsResult = await db.select().from(products);
      let filteredCart = cartResult;
      if (userId) {
        filteredCart = cartResult.filter((item) => item.userId === userId);
      } else if (sessionId) {
        filteredCart = cartResult.filter((item) => item.sessionId === sessionId);
      }
      return filteredCart.map((item) => {
        const product = productsResult.find((p) => p.id === item.productId);
        return {
          ...item,
          product
        };
      }).filter((item) => item.product);
    } catch (error) {
      console.error("Error getting cart items:", error);
      return [];
    }
  }
  async addToCart(item) {
    try {
      const existing = await db.select().from(cartItems);
      const existingItem = existing.find(
        (cart) => cart.productId === item.productId && (item.userId && cart.userId === item.userId || item.sessionId && cart.sessionId === item.sessionId)
      );
      if (existingItem) {
        const result2 = await db.update(cartItems).set({ quantity: existingItem.quantity + (item.quantity || 1) }).returning();
        return result2.find((r) => r.id === existingItem.id);
      }
      const result = await db.insert(cartItems).values(item).returning();
      return result[0];
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }
  async updateCartItem(id, quantity) {
    try {
      if (quantity <= 0) {
        await db.delete(cartItems);
        return void 0;
      }
      const result = await db.update(cartItems).set({ quantity }).returning();
      return result.find((r) => r.id === id);
    } catch (error) {
      console.error("Error updating cart item:", error);
      return void 0;
    }
  }
  async removeFromCart(id) {
    try {
      await db.delete(cartItems);
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      return false;
    }
  }
  async clearCart(userId, sessionId) {
    try {
      await db.delete(cartItems);
      return true;
    } catch (error) {
      console.error("Error clearing cart:", error);
      return false;
    }
  }
  // Orders
  async getOrders(filters) {
    try {
      const result = await db.select().from(orders);
      if (filters?.customerId) {
        return result.filter((o) => o.customerId === filters.customerId);
      }
      return result;
    } catch (error) {
      console.error("Error getting orders:", error);
      return [];
    }
  }
  async getOrder(id) {
    try {
      const orderResult = await db.select().from(orders);
      const order = orderResult.find((o) => o.id === id);
      if (!order) return void 0;
      const itemsResult = await db.select().from(orderItems);
      const productsResult = await db.select().from(products);
      const orderItemsData = itemsResult.filter((item) => item.orderId === id);
      const items = orderItemsData.map((item) => {
        const product = productsResult.find((p) => p.id === item.productId);
        return {
          ...item,
          product
        };
      }).filter((item) => item.product);
      return { ...order, items };
    } catch (error) {
      console.error("Error getting order:", error);
      return void 0;
    }
  }
  // Reviews
  async getProductReviews(productId) {
    try {
      const result = await db.select().from(reviews);
      return result.filter((r) => r.productId === productId);
    } catch (error) {
      console.error("Error getting reviews:", error);
      return [];
    }
  }
  async createReview(review) {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        return res.json(existingUser);
      }
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });
  app2.get("/api/users/:firebaseUid", async (req, res) => {
    try {
      const { firebaseUid } = req.params;
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/seller-applications", async (req, res) => {
    try {
      const applicationData = insertSellerApplicationSchema.parse(req.body);
      const existingApplication = await storage.getSellerApplicationByUserId(applicationData.userId);
      if (existingApplication) {
        return res.status(409).json({ message: "Seller application already exists" });
      }
      const application = await storage.createSellerApplication(applicationData);
      res.json(application);
    } catch (error) {
      console.error("Error creating seller application:", error);
      res.status(400).json({ message: "Invalid application data" });
    }
  });
  app2.get("/api/seller-applications/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const application = await storage.getSellerApplicationByUserId(userId);
      if (!application) {
        return res.status(404).json({ message: "Seller application not found" });
      }
      res.json(application);
    } catch (error) {
      console.error("Error fetching seller application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig(({ command }) => {
  const isProduction = command === "build";
  return {
    root: "./",
    base: isProduction ? "./" : "/",
    plugins: [react()],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
      global: "window"
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "..", "shared"),
        buffer: "buffer/",
        stream: "stream-browserify",
        util: "util/"
      }
    },
    optimizeDeps: {
      exclude: [
        "express",
        "http",
        "https",
        "path",
        "fs",
        "events",
        "net",
        "crypto",
        "querystring",
        "url",
        "zlib",
        "async_hooks"
      ]
    },
    build: {
      outDir: path.resolve(__dirname, "..", "dist/public"),
      // ✅ IMPORTANT FIX
      emptyOutDir: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1e3,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return id.includes("node_modules") ? "vendor" : void 0;
          }
        }
      }
    }
  };
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
