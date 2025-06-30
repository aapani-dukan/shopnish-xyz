// @shared/backend/schema.ts
import { pgTable, text, serial, integer, decimal, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Drizzle ORM Table Definitions ---

// User roles: customer, seller, admin, delivery_boy
// 'UserRole' और 'ApprovalStatus' enums को एक्सपोर्ट करें ताकि वे seed.ts और अन्य फ़ाइलों में उपयोग किए जा सकें
export const UserRole = z.enum(["customer", "seller", "admin", "delivery_boy"]);
export const ApprovalStatus = z.enum(["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(), // Firebase UID यहाँ जोड़ें
  email: text("email").notNull().unique(),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  role: varchar("role", { enum: UserRole.enumValues }).notNull().default("customer"), // Zod enum का उपयोग करें
  approvalStatus: varchar("approval_status", { enum: ApprovalStatus.enumValues }).notNull().default("approved"), // Zod enum का उपयोग करें
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ✅ Sellers Table - यह अब एक Drizzle pgTable है!
export const sellersPgTable = pgTable("sellers", {
  id: serial("id").primaryKey(), // ऑटो-इंक्रीमेंटिंग प्राइमरी की
  // userId को INTEGER में बदलें और users.id को रेफरेंस करें
  userId: integer("user_id").unique().notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(), // grocery, restaurant, etc.
  description: text("description"),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  businessPhone: text("business_phone").notNull(),
  gstNumber: text("gst_number"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  deliveryRadius: integer("delivery_radius"), // INTEGER, क्योंकि आप parseInt() का उपयोग कर रहे हैं
  email: text("email"), // Optional email (can be same as user's primary email)
  phone: text("phone"), // Optional phone (can be same as businessPhone)
  address: text("address"), // Optional address (can be same as businessAddress)
  approvalStatus: varchar("approval_status", { enum: ApprovalStatus.enumValues }).notNull().default("pending"), // Zod enum का उपयोग करें
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seller store information
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => sellersPgTable.id), // ✅ sellersPgTable.id को रेफ़रेंस करें
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
  sellerId: integer("seller_id").references(() => sellersPgTable.id), // ✅ sellersPgTable.id को रेफ़रेंस करें
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
  // firebaseUid को optional रखें यदि यह users.id से जुड़ता है
  firebaseUid: text("firebase_uid").unique(),
  // userId को INTEGER में बदलें और users.id को रेफरेंस करें
  userId: integer("user_id").unique().notNull().references(() => users.id), // Firebase UID के बजाय users.id को रेफरेंस करें
  email: text("email").unique().notNull(),
  name: text("name"),
  approvalStatus: varchar("approval_status", { enum: ApprovalStatus.enumValues }).notNull().default("pending"),
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
  deliveryBoyId: integer("delivery_boy_id").references(() => deliveryBoys.id), // nullable हो सकता है
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
  sellerId: integer("seller_id").references(() => sellersPgTable.id), // ✅ sellersPgTable.id को रेफ़रेंस करें
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

// --- Zod Schemas for Validation ---
// ✅ `sellers` Zod ऑब्जेक्ट - अब Drizzle `sellersPgTable` से मेल खाता है
// Drizzle-Zod से सीधे इन्फर करने के लिए इस मैनुअल Zod ऑब्जेक्ट की आवश्यकता नहीं है
// export const sellers = z.object({ /* ... */ });

// --- Insert Schemas (Drizzle-Zod) ---
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSellerSchema = createInsertSchema(sellersPgTable, { // ✅ sellersPgTable से क्रिएट करें
  // userId को Zod में number के रूप में परिभाषित करें ताकि यह users.id (integer) से मेल खाए
  userId: z.number(), // userId अब integer है, text नहीं
  businessPhone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  deliveryRadius: z.number().int().min(1, "Delivery Radius must be at least 1 km"),
  // approvalStatus को enum के रूप में सीधे जोड़ें यदि createInsertSchema इसे इन्फर नहीं करता है
  approvalStatus: ApprovalStatus.optional().default("pending"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products, {
  price: z.string(), // Drizzle decimal के लिए string
  originalPrice: z.string().optional(), // Drizzle decimal के लिए string
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryAreaSchema = createInsertSchema(deliveryAreas, {
  deliveryCharge: z.string(), // Drizzle decimal के लिए string
  freeDeliveryAbove: z.string().optional(), // Drizzle decimal के लिए string
}).omit({
  id: true,
});

export const insertDeliveryBoySchema = createInsertSchema(deliveryBoys, {
  userId: z.number(), // userId अब integer है
  email: z.string().email(), // email को null नहीं होने दें
  name: z.string().min(1, "Name is required"), // name को null नहीं होने दें
  approvalStatus: ApprovalStatus.optional().default("pending"), // enum
  rating: z.string().optional().default("5.0"), // decimal है तो string
}).omit({
  id: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders, {
  subtotal: z.string(), // Drizzle decimal के लिए string
  deliveryCharge: z.string().optional(), // Drizzle decimal के लिए string
  discount: z.string().optional(), // Drizzle decimal के लिए string
  total: z.string(), // Drizzle decimal के लिए string
  deliveryAddress: z.record(z.string(), z.any()), // JSON type
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  unitPrice: z.string(), // Drizzle decimal के लिए string
  totalPrice: z.string(), // Drizzle decimal के लिए string
}).omit({
  id: true,
});

export const insertOrderTrackingSchema = createInsertSchema(orderTracking).omit({
  id: true,
  createdAt: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes, {
  discountValue: z.string(),
  minOrderAmount: z.string().optional(),
  maxDiscount: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

export const insertServiceSchema = createInsertSchema(services, {
  basePrice: z.string(), // Drizzle decimal के लिए string
}).omit({
  id: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders, {
  rating: z.string().optional().default("5.0"), // decimal है तो string
}).omit({
  id: true,
  createdAt: true,
});

export const insertServiceBookingSchema = createInsertSchema(serviceBookings, {
  price: z.string(), // Drizzle decimal के लिए string
  address: z.record(z.string(), z.any()), // JSON type
}).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// --- Types ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Seller Types
export type Seller = typeof sellersPgTable.$inferSelect;
export type InsertSeller = z.infer<typeof insertSellerSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type DeliveryArea = typeof deliveryAreas.$inferSelect;
export type InsertDeliveryArea = z.infer<typeof insertDeliveryAreaSchema>;

export type DeliveryBoy = typeof deliveryBoys.$inferSelect;
export type InsertDeliveryBoy = z.infer<typeof insertDeliveryBoySchema>;

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

// AuthenticatedRequest type (इसे भी यहां परिभाषित/निर्यात करें)
// यदि आप इसे सीधे '@/shared/types' से इम्पोर्ट कर रहे हैं
// तो यह फ़ाइल 'types.ts' बन जाएगी
export interface AuthenticatedUser {
  id: number; // users table id
  firebaseUid: string;
  email: string;
  role: z.infer<typeof UserRole>;
  approvalStatus: z.infer<typeof ApprovalStatus>;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  }
