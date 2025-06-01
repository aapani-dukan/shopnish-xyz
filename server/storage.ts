import { eq, and, or, like, desc, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, stores, categories, products, cartItems, orders, orderItems, reviews,
  deliveryAreas, deliveryBoys, orderTracking, promoCodes, serviceCategories,
  services, serviceProviders, serviceBookings,
  type User, type InsertUser, type Store, type InsertStore,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Review, type InsertReview,
  type DeliveryArea, type InsertDeliveryArea, type DeliveryBoy, type InsertDeliveryBoy,
  type OrderTracking, type InsertOrderTracking, type PromoCode, type InsertPromoCode,
  type ServiceCategory, type InsertServiceCategory, type Service, type InsertService,
  type ServiceProvider, type InsertServiceProvider, type ServiceBooking, type InsertServiceBooking
} from "@shared/schema";

export interface IStorage {
  // Authentication & Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;

  // Stores
  getStores(filters?: { sellerId?: number; city?: string; isActive?: boolean }): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, updates: Partial<Store>): Promise<Store | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<Category>): Promise<Category | undefined>;

  // Products
  getProducts(filters?: { 
    categoryId?: number; 
    sellerId?: number; 
    city?: string; 
    search?: string; 
    isActive?: boolean;
  }): Promise<(Product & { store: Store; seller: User })[]>;
  getProduct(id: number): Promise<(Product & { store: Store; seller: User }) | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;

  // Delivery Areas
  getDeliveryAreas(city?: string): Promise<DeliveryArea[]>;
  getDeliveryAreaByPincode(pincode: string): Promise<DeliveryArea | undefined>;
  createDeliveryArea(area: InsertDeliveryArea): Promise<DeliveryArea>;

  // Delivery Boys
  getDeliveryBoys(filters?: { city?: string; isAvailable?: boolean }): Promise<(DeliveryBoy & { user: User })[]>;
  getDeliveryBoy(id: number): Promise<(DeliveryBoy & { user: User }) | undefined>;
  createDeliveryBoy(deliveryBoy: InsertDeliveryBoy): Promise<DeliveryBoy>;
  updateDeliveryBoy(id: number, updates: Partial<DeliveryBoy>): Promise<DeliveryBoy | undefined>;

  // Shopping Cart
  getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product & { store: Store } })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId?: number, sessionId?: string): Promise<boolean>;

  // Orders
  getOrders(filters?: { customerId?: number; deliveryBoyId?: number; status?: string }): Promise<Order[]>;
  getOrder(id: number): Promise<(Order & { 
    items: (OrderItem & { product: Product })[];
    customer: User;
    deliveryBoy?: DeliveryBoy & { user: User };
    tracking: OrderTracking[];
  }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: number, status: string, deliveryBoyId?: number): Promise<Order | undefined>;
  assignDeliveryBoy(orderId: number, deliveryBoyId: number): Promise<boolean>;

  // Order Tracking
  addOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking>;
  getOrderTracking(orderId: number): Promise<OrderTracking[]>;

  // Promo Codes
  getPromoCodes(isActive?: boolean): Promise<PromoCode[]>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined>;

  // Service Categories & Services
  getServiceCategories(): Promise<ServiceCategory[]>;
  getServices(categoryId?: number): Promise<Service[]>;
  getServiceProviders(serviceId?: number): Promise<(ServiceProvider & { user: User; service: Service })[]>;
  createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking>;
  getServiceBookings(filters?: { customerId?: number; serviceProviderId?: number; status?: string }): Promise<ServiceBooking[]>;

  // Reviews
  getProductReviews(productId: number): Promise<(Review & { customer: User })[]>;
  createReview(review: InsertReview): Promise<Review>;
}

export class DatabaseStorage implements IStorage {
  // Authentication & Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Stores
  async getStores(filters?: { sellerId?: number; city?: string; isActive?: boolean }): Promise<Store[]> {
    let query = db.select().from(stores);
    
    if (filters?.sellerId) {
      query = query.where(eq(stores.sellerId, filters.sellerId));
    }
    if (filters?.city) {
      query = query.where(eq(stores.city, filters.city));
    }
    if (filters?.isActive !== undefined) {
      query = query.where(eq(stores.isActive, filters.isActive));
    }
    
    return await query;
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async updateStore(id: number, updates: Partial<Store>): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  // Products
  async getProducts(filters?: { 
    categoryId?: number; 
    sellerId?: number; 
    city?: string; 
    search?: string; 
    isActive?: boolean;
  }): Promise<(Product & { store: Store; seller: User })[]> {
    let query = db
      .select({
        ...products,
        store: stores,
        seller: users,
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(products.sellerId, users.id));

    const conditions = [];

    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters?.sellerId) {
      conditions.push(eq(products.sellerId, filters.sellerId));
    }
    if (filters?.city) {
      conditions.push(eq(stores.city, filters.city));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.nameHindi, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<(Product & { store: Store; seller: User }) | undefined> {
    const [product] = await db
      .select({
        ...products,
        store: stores,
        seller: users,
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  // Delivery Areas
  async getDeliveryAreas(city?: string): Promise<DeliveryArea[]> {
    let query = db.select().from(deliveryAreas).where(eq(deliveryAreas.isActive, true));
    
    if (city) {
      query = query.where(eq(deliveryAreas.city, city));
    }
    
    return await query;
  }

  async getDeliveryAreaByPincode(pincode: string): Promise<DeliveryArea | undefined> {
    const [area] = await db
      .select()
      .from(deliveryAreas)
      .where(and(eq(deliveryAreas.pincode, pincode), eq(deliveryAreas.isActive, true)));
    return area;
  }

  async createDeliveryArea(area: InsertDeliveryArea): Promise<DeliveryArea> {
    const [newArea] = await db.insert(deliveryAreas).values(area).returning();
    return newArea;
  }

  // Delivery Boys
  async getDeliveryBoys(filters?: { city?: string; isAvailable?: boolean }): Promise<(DeliveryBoy & { user: User })[]> {
    let query = db
      .select({
        ...deliveryBoys,
        user: users,
      })
      .from(deliveryBoys)
      .leftJoin(users, eq(deliveryBoys.userId, users.id));

    const conditions = [];
    
    if (filters?.city) {
      conditions.push(eq(users.city, filters.city));
    }
    if (filters?.isAvailable !== undefined) {
      conditions.push(eq(deliveryBoys.isAvailable, filters.isAvailable));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async getDeliveryBoy(id: number): Promise<(DeliveryBoy & { user: User }) | undefined> {
    const [deliveryBoy] = await db
      .select({
        ...deliveryBoys,
        user: users,
      })
      .from(deliveryBoys)
      .leftJoin(users, eq(deliveryBoys.userId, users.id))
      .where(eq(deliveryBoys.id, id));
    return deliveryBoy;
  }

  async createDeliveryBoy(deliveryBoy: InsertDeliveryBoy): Promise<DeliveryBoy> {
    const [newDeliveryBoy] = await db.insert(deliveryBoys).values(deliveryBoy).returning();
    return newDeliveryBoy;
  }

  async updateDeliveryBoy(id: number, updates: Partial<DeliveryBoy>): Promise<DeliveryBoy | undefined> {
    const [updatedDeliveryBoy] = await db
      .update(deliveryBoys)
      .set(updates)
      .where(eq(deliveryBoys.id, id))
      .returning();
    return updatedDeliveryBoy;
  }

  // Shopping Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product & { store: Store } })[]> {
    let query = db
      .select({
        ...cartItems,
        product: {
          ...products,
          store: stores,
        },
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(stores, eq(products.storeId, stores.id));

    if (userId) {
      query = query.where(eq(cartItems.userId, userId));
    } else if (sessionId) {
      query = query.where(eq(cartItems.sessionId, sessionId));
    }

    return await query;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    let existingQuery = db.select().from(cartItems).where(eq(cartItems.productId, item.productId!));
    
    if (item.userId) {
      existingQuery = existingQuery.where(eq(cartItems.userId, item.userId));
    } else if (item.sessionId) {
      existingQuery = existingQuery.where(eq(cartItems.sessionId, item.sessionId));
    }

    const [existingItem] = await existingQuery;

    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    }

    const [newItem] = await db.insert(cartItems).values(item).returning();
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, id));
      return undefined;
    }

    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount > 0;
  }

  async clearCart(userId?: number, sessionId?: string): Promise<boolean> {
    let query = db.delete(cartItems);
    
    if (userId) {
      query = query.where(eq(cartItems.userId, userId));
    } else if (sessionId) {
      query = query.where(eq(cartItems.sessionId, sessionId));
    }

    const result = await query;
    return result.rowCount > 0;
  }

  // Orders
  async getOrders(filters?: { customerId?: number; deliveryBoyId?: number; status?: string }): Promise<Order[]> {
    let query = db.select().from(orders);

    const conditions = [];
    
    if (filters?.customerId) {
      conditions.push(eq(orders.customerId, filters.customerId));
    }
    if (filters?.deliveryBoyId) {
      conditions.push(eq(orders.deliveryBoyId, filters.deliveryBoyId));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<(Order & { 
    items: (OrderItem & { product: Product })[];
    customer: User;
    deliveryBoy?: DeliveryBoy & { user: User };
    tracking: OrderTracking[];
  }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const [customer] = await db.select().from(users).where(eq(users.id, order.customerId!));
    
    const items = await db
      .select({
        ...orderItems,
        product: products,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    const tracking = await db
      .select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, id))
      .orderBy(desc(orderTracking.createdAt));

    let deliveryBoy;
    if (order.deliveryBoyId) {
      const [dbResult] = await db
        .select({
          ...deliveryBoys,
          user: users,
        })
        .from(deliveryBoys)
        .leftJoin(users, eq(deliveryBoys.userId, users.id))
        .where(eq(deliveryBoys.id, order.deliveryBoyId));
      deliveryBoy = dbResult;
    }

    return {
      ...order,
      items,
      customer,
      deliveryBoy,
      tracking,
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    // Insert order items
    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });
    }

    return newOrder;
  }

  async updateOrderStatus(id: number, status: string, deliveryBoyId?: number): Promise<Order | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (deliveryBoyId) {
      updateData.deliveryBoyId = deliveryBoyId;
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async assignDeliveryBoy(orderId: number, deliveryBoyId: number): Promise<boolean> {
    const result = await db
      .update(orders)
      .set({ deliveryBoyId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    return result.rowCount > 0;
  }

  // Order Tracking
  async addOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking> {
    const [newTracking] = await db.insert(orderTracking).values(tracking).returning();
    return newTracking;
  }

  async getOrderTracking(orderId: number): Promise<OrderTracking[]> {
    return await db
      .select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, orderId))
      .orderBy(desc(orderTracking.createdAt));
  }

  // Promo Codes
  async getPromoCodes(isActive?: boolean): Promise<PromoCode[]> {
    let query = db.select().from(promoCodes);
    
    if (isActive !== undefined) {
      query = query.where(eq(promoCodes.isActive, isActive));
    }
    
    return await query;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.code, code), eq(promoCodes.isActive, true)));
    return promoCode;
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [newPromoCode] = await db.insert(promoCodes).values(promoCode).returning();
    return newPromoCode;
  }

  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [updatedPromoCode] = await db
      .update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, id))
      .returning();
    return updatedPromoCode;
  }

  // Service Categories & Services
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true));
  }

  async getServices(categoryId?: number): Promise<Service[]> {
    let query = db.select().from(services).where(eq(services.isActive, true));
    
    if (categoryId) {
      query = query.where(eq(services.categoryId, categoryId));
    }
    
    return await query;
  }

  async getServiceProviders(serviceId?: number): Promise<(ServiceProvider & { user: User; service: Service })[]> {
    let query = db
      .select({
        ...serviceProviders,
        user: users,
        service: services,
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(services, eq(serviceProviders.serviceId, services.id))
      .where(eq(serviceProviders.isAvailable, true));

    if (serviceId) {
      query = query.where(eq(serviceProviders.serviceId, serviceId));
    }

    return await query;
  }

  async createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking> {
    const [newBooking] = await db.insert(serviceBookings).values(booking).returning();
    return newBooking;
  }

  async getServiceBookings(filters?: { customerId?: number; serviceProviderId?: number; status?: string }): Promise<ServiceBooking[]> {
    let query = db.select().from(serviceBookings);

    const conditions = [];
    
    if (filters?.customerId) {
      conditions.push(eq(serviceBookings.customerId, filters.customerId));
    }
    if (filters?.serviceProviderId) {
      conditions.push(eq(serviceBookings.serviceProviderId, filters.serviceProviderId));
    }
    if (filters?.status) {
      conditions.push(eq(serviceBookings.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(serviceBookings.createdAt));
  }

  // Reviews
  async getProductReviews(productId: number): Promise<(Review & { customer: User })[]> {
    return await db
      .select({
        ...reviews,
        customer: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }
}

export const storage = new DatabaseStorage();
