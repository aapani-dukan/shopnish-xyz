// server/storage.ts

import { db } from "./db";
import {
  users, categories, products, cartItems, orders, orderItems, reviews, sellers, deliveryBoys,
  type User, type InsertUser, type Category, type InsertCategory,
  type Product, type InsertProduct, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type Review, type InsertReview, type Seller, type DeliveryBoy, type InsertDeliveryBoy
} from "@shared/backend/schema";

// ✅ Drizzle-orm से आवश्यक फ़ंक्शन इम्पोर्ट करें
import { eq, and, desc, or, sql } from "drizzle-orm"; // 'sql' को भी इम्पोर्ट करना सुनिश्चित करें

export interface IStorage {
  // Authentication & Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getSellers(filters?: { approvalStatus?: string }): Promise<Seller[]>;
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(filters?: { categoryId?: number; search?: string }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Shopping Cart
  getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId?: number, sessionId?: string): Promise<boolean>;

  // Orders
  getOrders(filters?: { customerId?: number }): Promise<Order[]>;
  getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;

  // Reviews
  getProductReviews(productId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Delivery Boys
  getDeliveryBoyByEmail(email: string): Promise<DeliveryBoy | undefined>;
  getDeliveryBoyByFirebaseUid(firebaseUid: string): Promise<DeliveryBoy | undefined>;
  createDeliveryBoy(data: InsertDeliveryBoy): Promise<DeliveryBoy>;
}

export class DatabaseStorage implements IStorage {
  // Authentication & Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by id:", error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      return undefined;
    }
  }

  async getSellers(filters?: { approvalStatus?: string }): Promise<Seller[]> {
    try {
      let query = db.select().from(sellers);
      if (filters?.approvalStatus) {
        query = query.where(eq(sellers.approvalStatus, filters.approvalStatus));
      }
      const sellersList = await query;
      return sellersList;
    } catch (error) {
      console.error("Error getting sellers:", error);
      return [];
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const result = await db.select().from(categories).where(eq(categories.isActive, true));
      return result;
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting category:", error);
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  // Products
  async getProducts(filters?: { categoryId?: number; search?: string }): Promise<Product[]> {
    try {
      const conditions: any[] = [eq(products.isActive, true)];

      if (filters?.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        // ✅ यहाँ ILIKE और SQL टैग का उपयोग किया गया है
        conditions.push(
          or(
            sql`${products.name} ILIKE ${'%' + searchLower + '%'}`,
            sql`${products.nameHindi} ILIKE ${'%' + searchLower + '%'}`,
            sql`${products.description} ILIKE ${'%' + searchLower + '%'}`,
          )
        );
      }
      
      const filteredProducts = await db.select().from(products).where(and(...conditions));
      return filteredProducts;
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  // -------------------- CART WRAPPERS --------------------
  async getCartItemsByUserId(userId: number) {
    return this.getCartItems(userId);
  }

  async addCartItem(item: InsertCartItem) {
    return this.addToCart(item);
  }

  async updateCartItemQuantity(id: number, _userId: number, quantity: number) {
    return this.updateCartItem(id, quantity);
  }

  async removeCartItem(id: number, _userId: number) {
    return this.removeFromCart(id);
  }

  // ------------------ DELIVERY BOY METHODS ------------------

  async getDeliveryBoyByEmail(email: string): Promise<DeliveryBoy | undefined> {
    const result = await db.select().from(deliveryBoys).where(eq(deliveryBoys.email, email)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async getDeliveryBoyByFirebaseUid(firebaseUid: string): Promise<DeliveryBoy | undefined> {
    const result = await db.select().from(deliveryBoys).where(eq(deliveryBoys.firebaseUid, firebaseUid)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async createDeliveryBoy(data: InsertDeliveryBoy): Promise<DeliveryBoy> {
    const result = await db.insert(deliveryBoys).values(data).returning();
    return result[0];
  }

  // --------------- createOrder OVERLOAD (Optional items) ---------------

  async createOrder(order: InsertOrder, items: InsertOrderItem[] = []): Promise<Order> {
    const orderResult = await db.insert(orders).values(order).returning();
    const newOrder = orderResult[0];

    if (items.length > 0) {
      await db.insert(orderItems).values(items.map(item => ({ ...item, orderId: newOrder.id })));
    }

    return newOrder;
  }


  // Shopping Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    try {
      let queryConditions: any[] = [];

      if (userId) {
        queryConditions.push(eq(cartItems.userId, userId));
      } else if (sessionId) {
        queryConditions.push(eq(cartItems.sessionId, sessionId));
      }

      if (queryConditions.length === 0) {
        console.warn("getCartItems called without userId or sessionId. Returning empty array.");
        return [];
      }

      const cartResult = await db.select({
        cartItem: cartItems,
        product: products
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(and(...queryConditions));

      return cartResult.map(row => ({
        ...row.cartItem,
        product: row.product!
      })).filter(item => item.product);
    } catch (error) {
      console.error("Error getting cart items:", error);
      return [];
    }
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    try {
      let existingConditions: any[] = [eq(cartItems.productId, item.productId)];
      if (item.userId) {
        existingConditions.push(eq(cartItems.userId, item.userId));
      } else if (item.sessionId) {
        existingConditions.push(eq(cartItems.sessionId, item.sessionId));
      }

      const existingItemResult = await db.select().from(cartItems).where(and(...existingConditions)).limit(1);
      const existingItem = existingItemResult.length > 0 ? existingItemResult[0] : undefined;

      if (existingItem) {
        const result = await db
          .update(cartItems)
          .set({ quantity: existingItem.quantity + (item.quantity || 1), updatedAt: new Date() })
          .where(eq(cartItems.id, existingItem.id))
          .returning();
        return result[0];
      }

      const result = await db.insert(cartItems).values({ ...item, createdAt: new Date(), updatedAt: new Date() }).returning();
      return result[0];
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    try {
      if (quantity <= 0) {
        const deletedResult = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
        return deletedResult.length > 0 ? deletedResult[0] : undefined;
      }

      const result = await db
        .update(cartItems)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(cartItems.id, id))
        .returning();
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error updating cart item:", error);
      return undefined;
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error removing from cart:", error);
      return false;
    }
  }

  async clearCart(userId?: number, sessionId?: string): Promise<boolean> {
    try {
      let deleteQuery = db.delete(cartItems);
      if (userId) {
        deleteQuery = deleteQuery.where(eq(cartItems.userId, userId));
      } else if (sessionId) {
        deleteQuery = deleteQuery.where(eq(cartItems.sessionId, sessionId));
      } else {
        console.warn("clearCart called without userId or sessionId. No items cleared.");
        return false;
      }
      await deleteQuery;
      return true;
    } catch (error) {
      console.error("Error clearing cart:", error);
      return false;
    }
  }

  // Orders
  async getOrders(filters?: { customerId?: number }): Promise<Order[]> {
    try {
      let query = db.select().from(orders);
      if (filters?.customerId) {
        query = query.where(eq(orders.customerId, filters.customerId));
      }
      const result = await query;
      return result;
    } catch (error) {
      console.error("Error getting orders:", error);
      return [];
    }
  }

  async getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    try {
      const orderResult = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      const order = orderResult.length > 0 ? orderResult[0] : undefined;
      if (!order) return undefined;

      const itemsAndProductsResult = await db.select({
        orderItem: orderItems,
        product: products
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

      const items = itemsAndProductsResult.map(row => ({
        ...row.orderItem,
        product: row.product!
      })).filter(item => item.product);

      return { ...order, items };
    } catch (error) {
      console.error("Error getting order:", error);
      return undefined;
    }
  }


  // Reviews
  async getProductReviews(productId: number): Promise<Review[]> {
    try {
      const result = await db.select().from(reviews).where(eq(reviews.productId, productId));
      return result;
    } catch (error) {
      console.error("Error getting reviews:", error);
      return [];
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
