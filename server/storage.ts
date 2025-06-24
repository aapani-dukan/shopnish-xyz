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
import { eq, and, desc } from "drizzle-orm"; // 'eq' (equality), 'and' (multiple conditions), 'desc' (descending order)

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

// यह `sellers` एरे अब उपयोगी नहीं है यदि आप डेटाबेस से डेटा प्राप्त कर रहे हैं।
// इसे हटा दें या समझें कि यह केवल एक डमी है और इसका उपयोग नहीं किया जाएगा।
// export const sellers = [
//   {
//     id: "1",
//     name: "Test Seller",
//     approvalStatus: "pending",
//     appliedAt: new Date().toISOString(),
//   },
// ];

export class DatabaseStorage implements IStorage {
  // Authentication & Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // ✅ Drizzle ORM का उपयोग करें
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      // ✅ Drizzle ORM का उपयोग करें
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by id:", error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      // ✅ Drizzle ORM का उपयोग करें
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
      const sellersList = await query; // क्वेरी को एक्सिक्यूट करें
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
      const result = await db.select().from(categories).where(eq(categories.isActive, true)); // isActive के लिए where clause
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
      let query = db.select().from(products).where(eq(products.isActive, true)); // हमेशा एक्टिव प्रोडक्ट्स
      
      const conditions: any[] = [eq(products.isActive, true)]; // एक एरे में शर्तें जोड़ें

      if (filters?.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }

      if (filters?.search) {
        // Drizzle में `ilike` केस-इनसेंसिटिव सर्च के लिए
        conditions.push(
          and(
            // Drizzle में लाइक ऑपरेटर का उपयोग करें
            // आपको `@shared/backend/schema` में 'name', 'nameHindi', 'description' के प्रकारों को जांचना होगा।
            // यदि वे nullable हैं, तो आपको null हैंडलिंग की आवश्यकता हो सकती है।
            // Drizzle में `ilike` का उपयोग करें यदि आपका डेटाबेस इसका समर्थन करता है
            // या `like` और `lower()` फ़ंक्शन का उपयोग करें।
            // उदाहरण: like(sql`lower(${products.name})`, `%${filters.search.toLowerCase()}%`),
            //       or(like(products.name, `%${filters.search}%`), like(products.nameHindi, `%${filters.search}%`), like(products.description, `%${filters.search}%`))
            // यहाँ केवल एक उदाहरण है, आपको अपनी स्कीमा और आवश्यकताओं के अनुसार इसे समायोजित करना होगा
            // Drizzle में सीधे `includes` नहीं होता, `like` या `ilike` का उपयोग करें।
            // यह मानते हुए कि आप `@shared/backend/schema` में `sql` और `or` को भी इम्पोर्ट कर सकते हैं।
            // यदि नहीं, तो आपको इन शर्तों को अलग से बनाना होगा।
            // यदि आप केवल एक कॉलम पर सर्च कर रहे हैं, तो यह आसान है।
            // जैसे: like(products.name, `%${filters.search}%`)
            // मल्टी-कॉलम सर्च के लिए `or` का उपयोग करें।
            // `or` के लिए `drizzle-orm` से इम्पोर्ट करना होगा।
            // यहाँ एक सरल `like` उदाहरण है (केस-सेंसिटिव):
            // यदि केस-इनसेंसिटिव चाहिए तो `sql` टैग और `lower()` का उपयोग करें।
            // Drizzle में `ilike` सीधे नहीं होता है, लेकिन PostgreSQL में होता है जिसे `sql` टैग के साथ उपयोग कर सकते हैं
            // जैसे: sql`${products.name} ILIKE ${'%' + filters.search + '%'}`
            // या यदि स्कीमा में `sql` नहीं है तो `like` और `.toLowerCase()` का उपयोग करें।
            // यहाँ एक सरल उदाहरण है, आपको अपने उपयोग के आधार पर इसे अनुकूलित करना होगा।
            like(products.name, `%${filters.search}%`) // सरल 'like' उदाहरण
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
  // ये सीधे IStorage इंटरफ़ेस के मेथड को कॉल कर रहे हैं।
  // सुनिश्चित करें कि वे मेथड खुद Drizzle का सही उपयोग करते हैं।
  async getCartItemsByUserId(userId: number) {
    return this.getCartItems(userId); // यह ठीक है, अगर getCartItems सही है
  }

  async addCartItem(item: InsertCartItem) {
    return this.addToCart(item); // यह ठीक है, अगर addToCart सही है
  }

  async updateCartItemQuantity(id: number, _userId: number, quantity: number) {
    return this.updateCartItem(id, quantity); // यह ठीक है, अगर updateCartItem सही है
  }

  async removeCartItem(id: number, _userId: number) {
    return this.removeFromCart(id); // यह ठीक है, अगर removeFromCart सही है
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

    // यदि `items` हैं, तो उन्हें `orderItems` टेबल में डालें
    if (items.length > 0) {
      await db.insert(orderItems).values(items.map(item => ({ ...item, orderId: newOrder.id })));
    }

    return newOrder;
  }


  // Shopping Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    try {
      let queryConditions: any[] = []; // एक एरे में शर्तें जोड़ें

      if (userId) {
        queryConditions.push(eq(cartItems.userId, userId));
      } else if (sessionId) {
        queryConditions.push(eq(cartItems.sessionId, sessionId));
      }

      // यदि कोई शर्त नहीं है, तो सभी कार्ट आइटम फ़ेच न करें, यह एक संभावित लॉजिक एरर हो सकती है।
      // आपको यह सुनिश्चित करना चाहिए कि या तो userId या sessionId हमेशा प्रदान किया जाता है।
      if (queryConditions.length === 0) {
        console.warn("getCartItems called without userId or sessionId. Returning empty array.");
        return [];
      }

      // Drizzle में joins का उपयोग करें यदि आप संबंधित प्रोडक्ट डेटा लाना चाहते हैं
      const cartResult = await db.select({
        cartItem: cartItems,
        product: products // प्रोडक्ट को भी सिलेक्ट करें
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id)) // प्रोडक्ट टेबल के साथ जॉइन करें
      .where(and(...queryConditions)); // सभी शर्तों को 'and' के साथ जोड़ें

      // जॉइन के परिणामों को मैप करें
      return cartResult.map(row => ({
        ...row.cartItem,
        product: row.product! // product अब सीधे row.product में उपलब्ध होगा
      })).filter(item => item.product); // उन आइटम्स को फ़िल्टर करें जिनके लिए प्रोडक्ट नहीं मिला
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
        // Update quantity
        const result = await db
          .update(cartItems)
          .set({ quantity: existingItem.quantity + (item.quantity || 1), updatedAt: new Date() }) // updatedAt जोड़ें
          .where(eq(cartItems.id, existingItem.id)) // अपडेट करने के लिए where clause आवश्यक है
          .returning();
        return result[0]; // यह पहला अपडेटेड आइटम लौटाएगा
      }

      // New item
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
        // ✅ Drizzle में delete के लिए where clause की आवश्यकता होगी
        const deletedResult = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
        return deletedResult.length > 0 ? deletedResult[0] : undefined; // हटाए गए आइटम को लौटाएँ (यदि कोई है)
      }

      // ✅ Drizzle में update के लिए where clause की आवश्यकता होगी
      const result = await db
        .update(cartItems)
        .set({ quantity, updatedAt: new Date() }) // updatedAt जोड़ें
        .where(eq(cartItems.id, id)) // अपडेट करने के लिए where clause आवश्यक है
        .returning();
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error updating cart item:", error);
      return undefined;
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      // ✅ Drizzle में delete के लिए where clause की आवश्यकता होगी
      const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
      return result.length > 0; // यदि कोई रिकॉर्ड डिलीट हुआ तो true लौटाएँ
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
        // यदि userId या sessionId दोनों में से कोई भी नहीं है, तो कुछ भी डिलीट न करें
        console.warn("clearCart called without userId or sessionId. No items cleared.");
        return false;
      }
      await deleteQuery; // क्वेरी को एक्सिक्यूट करें
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

      // OrderItems और Products को एक साथ जॉइन करें
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
      })).filter(item => item.product); // उन आइटम्स को फ़िल्टर करें जिनके लिए प्रोडक्ट नहीं मिला

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
          
