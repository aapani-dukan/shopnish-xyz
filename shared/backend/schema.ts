// @shared/backend/schema.ts
import { pgTable, text, serial, integer, decimal, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core"; // varchar को इम्पोर्ट करें
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


// ✅ ध्यान दें: `sellers` Zod ऑब्जेक्ट है, Drizzle स्कीमा नहीं।
// यदि आप इसे डेटाबेस टेबल के रूप में उपयोग करना चाहते हैं, तो इसे `pgTable` में बदलना होगा।
// फिलहाल, मैं इसे छोड़ रहा हूँ, लेकिन यह संभावित रूप से एक असंगति का स्रोत है।
export const sellers = z.object({
  id: z.string().uuid(),
  userId: z.string(), // यह 'users' टेबल के 'id' से रेफरेंस होना चाहिए अगर यह DB से है
  businessName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
  approvedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
🆕 Seller application table
export const sellerApplications = pgTable("seller_applications", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id").references(() => users.id).notNull(),
  businessName:  text("business_name").notNull(),
  gstNumber:     text("gst_number"),
  phone:         text("phone"),
  address:       text("address"),
  city:          text("city"),
  pincode:       text("pincode"),
  approvalStatus: varchar("approval_status", {
    enum: ["pending", "approved", "rejected"],
  }).default("pending"),

  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});


// User roles: customer, seller, admin, delivery_boy
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(), // ✅ Firebase UID यहाँ जोड़ें
  email: text("email").notNull().unique(),
  // password: text("password").notNull(), // ✅ यदि आप Firebase Auth का उपयोग कर रहे हैं तो इसकी आवश्यकता नहीं है
  name: text("name"), // ✅ यूज़र का नाम यहाँ जोड़ें
  firstName: text("first_name"), // इसे optional या हटा सकते हैं यदि 'name' ही काफी है
  lastName: text("last_name"),   // इसे optional या हटा सकते हैं
  phone: text("phone"),          // इसे optional या हटा सकते हैं
  role: varchar("role", { enum: ["customer", "seller", "admin", "delivery_boy"] }).notNull().default("customer"), // ✅ varchar और enum का उपयोग करें
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("approved"), // ✅ अप्रूवल स्टेटस जोड़ें
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seller store information
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id),
  storeName: text("store_name").notNull(),
  storeType: text("store_type").notNull(), // grocery, pharmacy, general, etc.
  address: text("address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  phone: text("phone").notNull(),
  isActive: boolean("is_active").default(true),
  licenseNumber: text("license_number"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow(),
});


// ✅ insertSellerSchema की आवश्यकता नहीं होगी यदि आप `users` टेबल में `role` का उपयोग कर रहे हैं।
// यदि आप इसे एक अलग 'sellers' टेबल के रूप में उपयोग कर रहे हैं, तो इसे `createInsertSchema` से बनाना बेहतर है।
// फिलहाल, मैंने इसे हटा दिया है क्योंकि यह `users` टेबल के लिए ऑथेंटिकेशन लॉजिक को ओवरलैप कर रहा है।
 export const insertSellerSchema = z.object({
   email: z.string().email(),
   password: z.string().min(6),
   firstName: z.string().min(1),
   lastName: z.string().min(1),
   phone: z.string().min(10),
   role: z.literal("seller").default("seller"),
 });


// Product categories for essentials
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Products from different sellers
export const products = pgTable("products", {
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
  unit: text("unit").notNull().default("piece"), // kg, liter, piece, etc.
  brand: text("brand"),
  stock: integer("stock").notNull().default(0),
  minOrderQty: integer("min_order_qty").default(1),
  maxOrderQty: integer("max_order_qty").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery areas and charges
export const deliveryAreas = pgTable("delivery_areas", {
  id: serial("id").primaryKey(),
  areaName: text("area_name").notNull(),
  pincode: text("pincode").notNull(),
  city: text("city").notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).notNull(),
  freeDeliveryAbove: decimal("free_delivery_above", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
});

// Delivery boys
export const deliveryBoys = pgTable("delivery_boys", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique().notNull(), // ✅ Firebase UID यहाँ जोड़ें
  email: text("email").unique().notNull(), // ✅ ईमेल यहाँ जोड़ें
  name: text("name"), // ✅ नाम यहाँ जोड़ें
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"), // ✅ अप्रूवल स्टेटस यहाँ जोड़ें
  // userId: integer("user_id").references(() => users.id), // ✅ इसे हटा दें या optional करें यदि आप Firebase UID से सीधे लिंक कर रहे हैं
  vehicleType: text("vehicle_type").notNull(), // bike, cycle, auto
  vehicleNumber: text("vehicle_number"),
  licenseNumber: text("license_number"),
  aadharNumber: text("aadhar_number"),
  isAvailable: boolean("is_available").default(true),
  currentLat: decimal("current_lat", { precision: 10, scale: 8 }),
  currentLng: decimal("current_lng", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalDeliveries: integer("total_deliveries").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping cart
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders with delivery tracking
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  deliveryBoyId: integer("delivery_boy_id").references(() => deliveryBoys.id),
  orderNumber: text("order_number").notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cod, online, upi
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed
  status: text("status").notNull().default("placed"), // placed, confirmed, packed, out_for_delivery, delivered, cancelled
  deliveryAddress: json("delivery_address").notNull(),
  deliveryInstructions: text("delivery_instructions"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  promoCode: text("promo_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  sellerId: integer("seller_id").references(() => users.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Order tracking/status updates
export const orderTracking = pgTable("order_tracking", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  status: text("status").notNull(),
  message: text("message"),
  messageHindi: text("message_hindi"),
  location: text("location"),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promo codes and discounts
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Home services
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  isActive: boolean("is_active").default(true),
});

export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  experience: text("experience"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalJobs: integer("total_jobs").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceBookings = pgTable("service_bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  serviceProviderId: integer("service_provider_id").references(() => serviceProviders.id),
  serviceId: integer("service_id").references(() => services.id),
  bookingNumber: text("booking_number").notNull().unique(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  address: json("address").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, confirmed, in_progress, completed, cancelled
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  customerNotes: text("customer_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer reviews for products
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Insert schemas ---
// ✅ `users` के लिए updated insert schema
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // यदि `firstName`, `lastName`, `phone` optional हैं या `name` से आ रहे हैं
  // तो उन्हें भी omit या optional करें
  // password: true, // Firebase Auth के साथ password की आवश्यकता नहीं
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryAreaSchema = createInsertSchema(deliveryAreas).omit({
  id: true,
});

// ✅ `deliveryBoys` के लिए updated insert schema
export const insertDeliveryBoySchema = createInsertSchema(deliveryBoys).omit({
  id: true,
  createdAt: true,
  // userId: true, // यदि आप इसे हटा रहे हैं तो यहाँ भी omit करें
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertOrderTrackingSchema = createInsertSchema(orderTracking).omit({
  id: true,
  createdAt: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
});

export const insertServiceBookingSchema = createInsertSchema(serviceBookings).omit({
  id: true,
  createdAt: true,
});
export const insertSellerApplicationSchema = createInsertSchema(sellerApplications).omit({
  id: true,
  createdAt: true,
});
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// --- Types ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>; // ✅ यह अब updated schema से infer होगा

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type DeliveryArea = typeof deliveryAreas.$inferSelect;
export type InsertDeliveryArea = z.infer<typeof insertDeliveryAreaSchema>;

export type DeliveryBoy = typeof deliveryBoys.$inferSelect;
export type InsertDeliveryBoy = z.infer<typeof insertDeliveryBoySchema>; // ✅ यह अब updated schema से infer होगा

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type OrderTracking = typeof orderTracking.$inferSelect;
export type InsertOrderTracking = z.infer<typeof insertOrderTrackingSchema>;

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;

export type ServiceBooking = typeof serviceBookings.$inferSelect;
export type InsertServiceBooking = z.infer<typeof insertServiceBookingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// ✅ Seller type को Drizzle स्कीमा से Infer करें यदि आप इसे डेटाबेस से उपयोग कर रहे हैं।
// यदि यह केवल एक Zod ऑब्जेक्ट है, तो इसे ऐसा ही छोड़ दें, लेकिन यह डेटाबेस से सीधे काम नहीं करेगा।
// मैं मान रहा हूँ कि आप इसे डेटाबेस टेबल के रूप में उपयोग करना चाहेंगे।
// तो आपको पहले `sellers` को `pgTable` में बदलना होगा अगर वह नहीं है।
// यदि आप seller के लिए अलग टेबल बनाते हैं तो यह कुछ ऐसा होगा:
/*
export const sellersPgTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique().notNull(), // One-to-one with users table
  businessName: text("business_name").notNull(),
  // Add other seller specific fields as needed
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type Seller = typeof sellersPgTable.$inferSelect;
export type InsertSeller = typeof sellersPgTable.$inferInsert;
*/

// यदि `sellers` केवल एक Zod object है और आप उसे database table की तरह use नहीं कर रहे, तो उसे वैसे ही छोड़ दें
// और `getSellers` function `storage.ts` में उसे in-memory handle करेगा।
// यहाँ आपके मौजूदा Zod object पर आधारित `Seller` type है:
export type Seller = z.infer<typeof sellers>;
