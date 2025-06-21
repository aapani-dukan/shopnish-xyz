
import { db } from "./db";
import {
  users, categories, products, cartItems, orders, orderItems, reviews,
  type User, type InsertUser, type Category, type InsertCategory, 
  type Product, type InsertProduct, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type Review, type InsertReview,type Seller,deliveryBoys,type DeliveryBoy,typeInsertDeliveryBoy
} from "@shared/backend/schema";


export interface IStorage {
  // Authentication & Users
   getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>; 
  
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
}

export const sellers = [
  {
    id: "1",
    name: "Test Seller",
    approvalStatus: "pending",
    appliedAt: new Date().toISOString(),
  },
];
export class DatabaseStorage implements IStorage {
  // Authentication & Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users);
      return result.find(u => u.email === email);
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users);
      return result.find(u => u.id === id);
    } catch (error) {
      console.error("Error getting user by id:", error);
      return undefined;
    }
  }
async getSellers(filters?: { approvalStatus?: string }): Promise<Seller[]> {
    const sellersList = await db.select().from(sellers);
    if (filters?.approvalStatus) {
      return sellersList.filter(s => s.approvalStatus === filters.approvalStatus);
    }
    return sellersList;
}
async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
  try {
    const result = await db.select().from(users);
    return result.find(u => u.firebaseUid === firebaseUid);
  } catch (error) {
    console.error("Error getting user by Firebase UID:", error);
    return undefined;
  }
}
  
  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const result = await db.select().from(categories);
      return result.filter(c => c.isActive);
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      const result = await db.select().from(categories);
      return result.find(c => c.id === id);
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
      const result = await db.select().from(products);
      let filtered = result.filter(p => p.isActive);

      if (filters?.categoryId) {
        filtered = filtered.filter(p => p.categoryId === filters.categoryId);
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.nameHindi?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const result = await db.select().from(products);
      return result.find(p => p.id === id);
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }





  // ...आपके existing methods के नीचे नीचे 👇 ये जोड़ें

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
    const list = await db.select().from(deliveryBoys);
    return list.find(b => b.email === email);
  }

  async getDeliveryBoyByFirebaseUid(firebaseUid: string): Promise<DeliveryBoy | undefined> {
    const list = await db.select().from(deliveryBoys);
    return list.find(b => b.firebaseUid === firebaseUid);
  }

  async createDeliveryBoy(data: InsertDeliveryBoy): Promise<DeliveryBoy> {
    const result = await db.insert(deliveryBoys).values(data).returning();
    return result[0];
  }

  // --------------- createOrder OVERLOAD (Optional items) ---------------

  async createOrder(order: InsertOrder, items: InsertOrderItem[] = []): Promise<Order> {
    const orderResult = await db.insert(orders).values(order).returning();
    const newOrder = orderResult[0];

    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });
    }

    return newOrder;
  }

  
  // Shopping Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    try {
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
      // Check if item already exists
      const existing = await db.select().from(cartItems);
      const existingItem = existing.find(cart => 
        cart.productId === item.productId &&
        ((item.userId && cart.userId === item.userId) ||
         (item.sessionId && cart.sessionId === item.sessionId))
      );

      if (existingItem) {
        // Update quantity
        const result = await db
          .update(cartItems)
          .set({ quantity: existingItem.quantity + (item.quantity || 1) })
          .returning();
        return result.find(r => r.id === existingItem.id)!;
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
        await db.delete(cartItems);
        return undefined;
      }

      const result = await db
        .update(cartItems)
        .set({ quantity })
        .returning();
      return result.find(r => r.id === id);
    } catch (error) {
      console.error("Error updating cart item:", error);
      return undefined;
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      await db.delete(cartItems);
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      return false;
    }
  }

  async clearCart(userId?: number, sessionId?: string): Promise<boolean> {
    try {
      await db.delete(cartItems);
      return true;
    } catch (error) {
      console.error("Error clearing cart:", error);
      return false;
    }
  }

  // Orders
  async getOrders(filters?: { customerId?: number }): Promise<Order[]> {
    try {
      const result = await db.select().from(orders);
      if (filters?.customerId) {
        return result.filter(o => o.customerId === filters.customerId);
      }
      return result;
    } catch (error) {
      console.error("Error getting orders:", error);
      return [];
    }
  }

  async getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    try {
      const orderResult = await db.select().from(orders);
      const order = orderResult.find(o => o.id === id);
      if (!order) return undefined;

      const itemsResult = await db.select().from(orderItems);
      const productsResult = await db.select().from(products);
      
      const orderItemsData = itemsResult.filter(item => item.orderId === id);
      const items = orderItemsData.map(item => {
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


  // Reviews
  async getProductReviews(productId: number): Promise<Review[]> {
    try {
      const result = await db.select().from(reviews);
      return result.filter(r => r.productId === productId);
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
