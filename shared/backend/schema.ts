// @shared/backend/schema.ts

import { pgTable, text, serial, integer, decimal, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from 'drizzle-orm';
import { z } from "zod";

// --- Drizzle ORM Table Definitions ---
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rejected',
]);

// Drizzle PG Enums - ये सीधे डेटाबेस में ENUM प्रकार बनाएंगे
export const userRoleEnum = pgEnum("user_role", ["customer", "seller", "admin", "delivery_boy"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);

// ✅ यूजर्स टेबल का सही स्कीमा: Neon DB से मेल खाता हुआ
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(), // ✅ firebaseUid को यहाँ जोड़ा गया
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("approved"),
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sellersPgTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  description: text("description"),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  businessPhone: text("business_phone").notNull(),
  gstNumber: text("gst_number"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  deliveryRadius: integer("delivery_radius"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => sellersPgTable.id),
  storeName: text("store_name").notNull(),
  storeType: text("store_type").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  phone: text("phone").notNull(),
  isActive: boolean("is_active").default(true),
  licenseNumber: text("license_number"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => sellersPgTable.id),
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
  brand: text("brand"),
  stock: integer("stock").notNull().default(0),
  minOrderQty: integer("min_order_qty").default(1),
  maxOrderQty: integer("max_order_qty").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryAreas = pgTable("delivery_areas", {
  id: serial("id").primaryKey(),
  areaName: text("area_name").notNull(),
  pincode: text("pincode").notNull(),
  city: text("city").notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).notNull(),
  freeDeliveryAbove: decimal("free_delivery_above", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
});

export const deliveryBoys = pgTable("delivery_boys", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(),
  userId: integer("user_id").unique().notNull().references(() => users.id),
  email: text("email").unique().notNull(),
  name: text("name"),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  vehicleType: text("vehicle_type").notNull(),
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

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  deliveryBoyId: integer("delivery_boy_id").references(() => deliveryBoys.id),
  orderNumber: text("order_number").notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  // ✅ यह लाइन बिल्कुल सही जगह पर है और पुरानी को बदल देती है।
  status: orderStatusEnum('status').default('pending').notNull(),
  deliveryAddress: json("delivery_address").notNull(),
  deliveryInstructions: text("delivery_instructions"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  promoCode: text("promo_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ✅ final updated orderItems table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  // ✅ यह लाइन जोड़ें
  userId: integer("user_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  sellerId: integer("seller_id").references(() => sellersPgTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  // ✅ यह लाइन भी जोड़ें
  status: orderStatusEnum('status').default('in_cart'),
});


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

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(),
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
  duration: integer("duration").notNull(),
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
  status: text("status").default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  customerNotes: text("customer_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Drizzle ORM Relations ---

   
// --- Drizzle ORM Relations ---

import { relations } from 'drizzle-orm';
import {
  users,
  sellersPgTable,
  deliveryBoys,
  orders,
  reviews,
  serviceProviders,
  serviceBookings,
  cartItems,
  stores,
  categories,
  products,
  orderItems,
  orderTracking,
  promoCodes,
  serviceCategories,
  services,
} from './schema'; // सुनिश्चित करें कि आपका स्कीमा ठीक से आयात किया गया है

export const usersRelations = relations(users, ({ one, many }) => ({
  // ✅ one-to-one संबंध को यहां से हटा दिया गया है
  orders: many(orders),
  reviews: many(reviews),
  serviceProviders: many(serviceProviders),
  serviceBookings: many(serviceBookings),
  cartItems: many(cartItems),
}));

export const sellersRelations = relations(sellersPgTable, ({ one, many }) => ({
  // ✅ 'one' संबंध को यहां रखा गया है
  user: one(users, {
    fields: [sellersPgTable.userId],
    references: [users.id],
  }),
  products: many(products),
  stores: many(stores),
  orderItems: many(orderItems),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  seller: one(sellersPgTable, {
    fields: [stores.sellerId],
    references: [sellersPgTable.id],
  }),
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  serviceCategories: many(serviceCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellersPgTable, {
    fields: [products.sellerId],
    references: [sellersPgTable.id],
  }),
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  reviews: many(reviews),
}));

export const deliveryBoysRelations = relations(deliveryBoys, ({ one, many }) => ({
  // ✅ 'one' संबंध को यहां रखा गया है
  user: one(users, {
    fields: [deliveryBoys.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  deliveryBoy: one(deliveryBoys, {
    fields: [orders.deliveryBoyId],
    references: [deliveryBoys.id],
  }),
  items: many(orderItems),
  tracking: many(orderTracking),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  seller: one(sellersPgTable, {
    fields: [orderItems.sellerId],
    references: [sellersPgTable.id],
  }),
}));

export const orderTrackingRelations = relations(orderTracking, ({ one }) => ({
  order: one(orders, {
    fields: [orderTracking.orderId],
    references: [orders.id],
  }),
  updatedBy: one(users, {
    fields: [orderTracking.updatedBy],
    references: [users.id],
  }),
}));

export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
  orders: many(orders),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many, one }) => ({
  services: many(services),
  category: one(categories, {
    fields: [serviceCategories.id],
    references: [categories.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  serviceProviders: many(serviceProviders),
  serviceBookings: many(serviceBookings),
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(users, {
    fields: [serviceProviders.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [serviceProviders.serviceId],
    references: [services.id],
  }),
  serviceBookings: many(serviceBookings),
}));

export const serviceBookingsRelations = relations(serviceBookings, ({ one }) => ({
  customer: one(users, {
    fields: [serviceBookings.customerId],
    references: [users.id],
  }),
  serviceProvider: one(serviceProviders, {
    fields: [serviceBookings.serviceProviderId],
    references: [serviceProviders.id],
  }),
  service: one(services, {
    fields: [serviceBookings.serviceId],
    references: [services.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(users, {
    fields: [reviews.customerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
}));


// --- Zod Schemas for Validation


export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSellerSchema = createInsertSchema(sellersPgTable, {
  userId: z.number().int(),
  businessPhone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  deliveryRadius: z.number().int().min(1, "Delivery Radius must be at least 1 km").optional(),
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
  price: z.string(),
  originalPrice: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryAreaSchema = createInsertSchema(deliveryAreas, {
  deliveryCharge: z.string(),
  freeDeliveryAbove: z.string().optional(),
}).omit({
  id: true,
});

export const insertDeliveryBoySchema = createInsertSchema(deliveryBoys, {
  userId: z.number().int(),
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  rating: z.string().optional().default("5.0"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders, {
  subtotal: z.string(),
  deliveryCharge: z.string().optional(),
  discount: z.string().optional(),
  total: z.string(),
  deliveryAddress: z.any(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems, {
  unitPrice: z.string(),
  totalPrice: z.string(),
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
  basePrice: z.string(),
}).omit({
  id: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders, {
  rating: z.string().optional().default("5.0"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertServiceBookingSchema = createInsertSchema(serviceBookings, {
  price: z.string(),
  address: z.any(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// --- Types ---
export type OrderItemWithProduct = {
  id: number;
  orderId: number;
  productId: number;
  sellerId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product: {
    id: number;
    name: string;
    nameHindi?: string;
    description?: string;
    descriptionHindi?: string;
    price: string;
    image: string;
    unit: string;
    brand?: string;
    stock: number;
  };
};

export type OrderWithItems = {
  id: number;
  orderNumber: string;
  subtotal: string;
  total: string;
  status: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  items: OrderItemWithProduct[];
};
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
