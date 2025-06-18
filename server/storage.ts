// server/storage.ts
import { db } from "./db";
import {
  users, categories, products, cartItems, orders, orderItems, reviews,
  // नए imports: deliveryBoys स्कीमा और उनके प्रकार
  deliveryBoys, // <-- सुनिश्चित करें कि यह @shared/backend/schema में परिभाषित है
  type User, type InsertUser, type Category, type InsertCategory,
  type Product, type InsertProduct, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type Review, type InsertReview,
  type Seller, // Seller टाइप को परिभाषित रखें अगर यह Schema से है
  type DeliveryBoy, type InsertDeliveryBoy // <-- नए डिलीवरी बॉय प्रकार
} from "@shared/backend/schema";
import { eq } from "drizzle-orm"; // Drizzle से `eq` ऑपरेटर इम्पोर्ट करें

// आपकी IStorage इंटरफ़ेस को अपडेट करें ताकि डिलीवरी बॉय के फंक्शन्स शामिल हों
export interface IStorage {
  // Authentication & Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // ✅ Sellers (अगर यह डेटाबेस से आ रहे हैं तो `drizzle-orm` का उपयोग करें)
  // यदि यह एक इन-मेमोरी एरे है, तो आपको इसे `db.select().from(sellers);` से हटाना होगा
  getSellers(filters?: { approvalStatus?: string }): Promise<Seller[]>;

  // ✅ डिलीवरी बॉय के लिए नए फंक्शन्स
  getDeliveryBoyByEmail(email: string): Promise<DeliveryBoy | undefined>;
  getDeliveryBoyById(id: number): Promise<DeliveryBoy | undefined>; // यदि आवश्यक हो तो
  createDeliveryBoy(deliveryBoy: InsertDeliveryBoy): Promise<DeliveryBoy>;

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
}

// यह 'sellers' एरे एक समस्या हो सकती है यदि आप इसे डेटाबेस से प्रबंधित करने का इरादा रखते हैं।
// यदि आप इसे डेटाबेस से प्रबंधित कर रहे हैं, तो इसे हटा दें और Drizzle के साथ काम करें।
// यदि यह केवल उदाहरण डेटा है, तो इसे यहीं रखें, लेकिन सुनिश्चित करें कि `getSellers` इसे हैंडल करता है।
// फिलहाल, मैं मान रहा हूँ कि `sellers` एक Drizzle स्कीमा है।
// export const sellers = [ /* ... your existing in-memory sellers array ... */ ];

export class DatabaseStorage implements IStorage {
  // Authentication & Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // ✅ Drizzle के `eq` ऑपरेटर का उपयोग करें सीधे डेटाबेस से क्वेरी करने के लिए
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      // ✅ Drizzle के `eq` ऑपरेटर का उपयोग करें
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting user by id:", error);
      return undefined;
    }
  }

  // ✅ getSellers को अपडेट करें यदि यह डेटाबेस से आता है
  // यदि 'sellers' एक Drizzle स्कीमा है:
  async getSellers(filters?: { approvalStatus?: string }): Promise<Seller[]> {
      try {
          let query = db.select().from(sellers); // 'sellers' को Drizzle स्कीमा मानें
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
    // ✅ सुनिश्चित करें कि `InsertUser` में `role` और `approvalStatus` शामिल हैं
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // --- ✅ नए डिलीवरी बॉय फंक्शन्स यहाँ जोड़ें ---
  async getDeliveryBoyByEmail(email: string): Promise<DeliveryBoy | undefined> {
    try {
      const result = await db.select().from(deliveryBoys).where(eq(deliveryBoys.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting delivery boy by email:", error);
      return undefined;
    }
  }

  async getDeliveryBoyById(id: number): Promise<DeliveryBoy | undefined> {
    try {
      const result = await db.select().from(deliveryBoys).where(eq(deliveryBoys.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting delivery boy by id:", error);
      return undefined;
    }
  }

  async createDeliveryBoy(deliveryBoy: InsertDeliveryBoy): Promise<DeliveryBoy> {
    const result = await db.insert(deliveryBoys).values(deliveryBoy).returning();
    return result[0];
  }
  // --- डिलीवरी बॉय फंक्शन्स का अंत ---


  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      // ✅ Drizzle के `where` और `eq` का उपयोग करें
      const result = await db.select().from(categories).where(eq(categories.isActive, true));
      return result;
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      // ✅ Drizzle के `where` और `eq` का उपयोग करें
      const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      return result[0];
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
      let query = db.select().from(products).where(eq(products.isActive, true));

      if (filters?.categoryId) {
        query = query.where(eq(products.categoryId, filters.categoryId));
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        // Drizzle के साथ `or` और `ilike` या `like` का उपयोग करें
        // यह in-memory filtering से बेहतर है
        // यहाँ केवल एक उदाहरण है; Drizzle के साथ इसे और बेहतर बनाया जा सकता है
        // (जैसे `or(ilike(products.name, `%${searchLower}%`), ilike(products.nameHindi, `%${searchLower}%`))`)
        // अभी के लिए, मैं आपके मौजूदा logic को बरकरार रख रहा हूँ लेकिन ध्यान दें कि यह डेटाबेस के बजाय JS में फ़िल्टर करेगा
        const allProducts = await query; // पहले सभी फ़िल्टर्ड उत्पाद प्राप्त करें
        return allProducts.filter(p =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.nameHindi?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }

      return await query; // यदि कोई सर्च फ़िल्टर नहीं है
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  // Shopping Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    try {
      // ✅ Drizzle के साथ `with` या `join` का उपयोग करें ताकि उत्पाद एक ही क्वेरी में मिल सकें
      // यहाँ सरलीकरण के लिए आपके मौजूदा in-memory join को रखा गया है
      const cartResult = await db.select().from(cartItems);
      const productsResult = await db.select().from(products);

      let filteredCart = cartResult;

      if (userId) {
        filteredCart = cartResult.filter(item => item.userId === userId);
      } else if (sessionId) {
        filteredCart = cartResult.filter(item => item.sessionId === sessionId);
      }

      return filteredCart.map(item => {
        const product = productsResult.find(p => p.id === item.productId);
        return {
          ...item,
          product: product!
        };
      }).filter(item => item.product);
    } catch (error) {
      console.error("Error getting cart items:", error);
      return [];
    }
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    try {
      const existing = await db.select().from(cartItems).where(
        eq(cartItems.productId, item.productId)
      );

      // Filter by userId or sessionId in memory for now,
      // but ideally this should be part of the Drizzle query using `and` and `or`
      const existingItem = existing.find(cart =>
        ((item.userId && cart.userId === item.userId) ||
         (item.sessionId && cart.sessionId === item.sessionId))
      );

      if (existingItem) {
        const result = await db
          .update(cartItems)
          .set({ quantity: existingItem.quantity + (item.quantity || 1) })
          .where(eq(cartItems.id, existingItem.id)) // ✅ `where` क्लॉज़ जोड़ें
          .returning();
        return result[0]; // ✅ array के पहले एलिमेंट को रिटर्न करें
      }

      const result = await db.insert(cartItems).values(item).returning();
      return result[0];
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    try {
      if (quantity <= 0) {
        // ✅ यहाँ `where` क्लॉज़ जोड़ना ज़रूरी है
        await db.delete(cartItems).where(eq(cartItems.id, id));
        return undefined;
      }

      const result = await db
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, id)) // ✅ `where` क्लॉज़ जोड़ें
        .returning();
      return result[0]; // ✅ array के पहले एलिमेंट को रिटर्न करें
    } catch (error) {
      console.error("Error updating cart item:", error);
      return undefined;
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      // ✅ यहाँ `where` क्लॉज़ जोड़ना ज़रूरी है
      const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
      return result.length > 0; // आइटम डिलीट हुआ या नहीं
    } catch (error) {
      console.error("Error removing from cart:", error);
      return false;
    }
  }

  async clearCart(userId?: number, sessionId?: string): Promise<boolean> {
    try {
      let query = db.delete(cartItems);
      // ✅ `where` क्लॉज़ जोड़ें ताकि पूरा कार्ट क्लियर न हो
      if (userId) {
        query = query.where(eq(cartItems.userId, userId));
      } else if (sessionId) {
        query = query.where(eq(cartItems.sessionId, sessionId));
      }
      await query;
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
      return await query;
    } catch (error) {
      console.error("Error getting orders:", error);
      return [];
    }
  }

  async getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    try {
      const orderResult = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      const order = orderResult[0];
      if (!order) return undefined;

      // ✅ Drizzle के साथ `with` या `join` का उपयोग करें ताकि उत्पाद एक ही क्वेरी में मिल सकें
      const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      const productsResult = await db.select().from(products); // यह inefficient है, join बेहतर है

      const items = itemsResult.map(item => {
        const product = productsResult.find(p => p.id === item.productId);
        return {
          ...item,
          product: product!
        };
      }).filter(item => item.product);

      return { ...order, items };
    } catch (error) {
      console.error("Error getting order:", error);
      return undefined;
    }
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    try {
      const orderResult = await db.insert(orders).values(order).returning();
      const newOrder = orderResult[0];

      // Insert order items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({ ...item, orderId: newOrder.id }));
        await db.insert(orderItems).values(itemsToInsert); // एक साथ इंसर्ट करें
      }

      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
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
