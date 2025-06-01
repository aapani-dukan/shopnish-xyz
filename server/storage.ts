import { 
  users, categories, products, cartItems, orders, orderItems, reviews,
  type User, type InsertUser, type Category, type InsertCategory,
  type Product, type InsertProduct, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type Review, type InsertReview
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(filters?: { categoryId?: number; featured?: boolean; search?: string }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;

  // Cart
  getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId?: number, sessionId?: string): Promise<boolean>;

  // Orders
  getOrders(userId: number): Promise<Order[]>;
  getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;

  // Reviews
  getProductReviews(productId: number): Promise<(Review & { user: User })[]>;
  createReview(review: InsertReview): Promise<Review>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private products: Map<number, Product> = new Map();
  private cartItems: Map<number, CartItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private reviews: Map<number, Review> = new Map();
  
  private currentUserId = 1;
  private currentCategoryId = 1;
  private currentProductId = 1;
  private currentCartItemId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;
  private currentReviewId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed categories
    const categories = [
      { name: "Electronics", slug: "electronics", description: "Latest gadgets and electronics", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661" },
      { name: "Fashion", slug: "fashion", description: "Trendy clothing and accessories", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8" },
      { name: "Home & Garden", slug: "home-garden", description: "Everything for your home", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7" },
      { name: "Sports", slug: "sports", description: "Sports and fitness equipment", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b" },
      { name: "Books", slug: "books", description: "Books and educational materials", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" },
      { name: "Health & Beauty", slug: "health-beauty", description: "Health and beauty products", image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6" },
    ];

    categories.forEach(cat => {
      const category: Category = { ...cat, id: this.currentCategoryId++ };
      this.categories.set(category.id, category);
    });

    // Seed products
    const products = [
      {
        name: "Wireless Bluetooth Headphones",
        description: "Premium wireless headphones with noise cancellation",
        price: "79.99",
        originalPrice: "99.99",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e"],
        categoryId: 1,
        brand: "AudioTech",
        stock: 50,
        rating: "4.5",
        reviewCount: 127,
        featured: true,
      },
      {
        name: "Smartphone Pro Max 256GB",
        description: "Latest smartphone with advanced camera system",
        price: "899.99",
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
        images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"],
        categoryId: 1,
        brand: "TechCorp",
        stock: 25,
        rating: "4.3",
        reviewCount: 89,
        featured: true,
      },
      {
        name: "Premium Running Shoes",
        description: "Comfortable running shoes for all terrains",
        price: "129.99",
        originalPrice: "159.99",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
        categoryId: 4,
        brand: "SportMax",
        stock: 75,
        rating: "4.8",
        reviewCount: 234,
        featured: true,
      },
      {
        name: "Premium Coffee Maker",
        description: "Professional grade coffee maker for perfect brewing",
        price: "199.99",
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38",
        images: ["https://images.unsplash.com/photo-1517256064527-09c73fc73e38"],
        categoryId: 3,
        brand: "BrewMaster",
        stock: 30,
        rating: "4.2",
        reviewCount: 156,
        featured: false,
      },
      {
        name: "Gaming Laptop Pro 16\"",
        description: "High-performance gaming laptop with RGB lighting",
        price: "1299.99",
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302",
        images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302"],
        categoryId: 1,
        brand: "GameTech",
        stock: 15,
        rating: "4.7",
        reviewCount: 67,
        featured: true,
      },
      {
        name: "Designer Smart Watch",
        description: "Elegant smartwatch with health monitoring",
        price: "349.99",
        originalPrice: "399.99",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30"],
        categoryId: 1,
        brand: "WatchCo",
        stock: 40,
        rating: "4.4",
        reviewCount: 198,
        featured: false,
      },
      {
        name: "Premium Skincare Set",
        description: "Complete skincare routine with natural ingredients",
        price: "89.99",
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6",
        images: ["https://images.unsplash.com/photo-1556228453-efd6c1ff04f6"],
        categoryId: 6,
        brand: "NaturalGlow",
        stock: 60,
        rating: "4.6",
        reviewCount: 342,
        featured: false,
      },
      {
        name: "Portable Bluetooth Speaker",
        description: "Waterproof speaker with powerful bass",
        price: "59.99",
        originalPrice: "79.99",
        image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1",
        images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1"],
        categoryId: 1,
        brand: "SoundWave",
        stock: 80,
        rating: "4.1",
        reviewCount: 145,
        featured: false,
      },
    ];

    products.forEach(prod => {
      const product: Product = { ...prod, id: this.currentProductId++ };
      this.products.set(product.id, product);
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Products
  async getProducts(filters?: { categoryId?: number; featured?: boolean; search?: string }): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters?.categoryId) {
      products = products.filter(p => p.categoryId === filters.categoryId);
    }

    if (filters?.featured !== undefined) {
      products = products.filter(p => p.featured === filters.featured);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower)
      );
    }

    return products;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updated = { ...product, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  // Cart
  async getCartItems(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    const items = Array.from(this.cartItems.values())
      .filter(item => {
        if (userId) return item.userId === userId;
        if (sessionId) return item.sessionId === sessionId;
        return false;
      });

    return items.map(item => {
      const product = this.products.get(item.productId!);
      return { ...item, product: product! };
    }).filter(item => item.product);
  }

  async addToCart(insertItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existingItem = Array.from(this.cartItems.values()).find(item => {
      if (insertItem.userId && item.userId === insertItem.userId && item.productId === insertItem.productId) {
        return true;
      }
      if (insertItem.sessionId && item.sessionId === insertItem.sessionId && item.productId === insertItem.productId) {
        return true;
      }
      return false;
    });

    if (existingItem) {
      // Update quantity
      existingItem.quantity += insertItem.quantity || 1;
      this.cartItems.set(existingItem.id, existingItem);
      return existingItem;
    }

    const id = this.currentCartItemId++;
    const item: CartItem = { ...insertItem, id };
    this.cartItems.set(id, item);
    return item;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (!item) return undefined;

    if (quantity <= 0) {
      this.cartItems.delete(id);
      return undefined;
    }

    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }

  async removeFromCart(id: number): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId?: number, sessionId?: string): Promise<boolean> {
    const itemsToDelete = Array.from(this.cartItems.entries())
      .filter(([_, item]) => {
        if (userId) return item.userId === userId;
        if (sessionId) return item.sessionId === sessionId;
        return false;
      })
      .map(([id]) => id);

    itemsToDelete.forEach(id => this.cartItems.delete(id));
    return itemsToDelete.length > 0;
  }

  // Orders
  async getOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.userId === userId);
  }

  async getOrder(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const items = Array.from(this.orderItems.values())
      .filter(item => item.orderId === id)
      .map(item => {
        const product = this.products.get(item.productId!);
        return { ...item, product: product! };
      })
      .filter(item => item.product);

    return { ...order, items };
  }

  async createOrder(insertOrder: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const orderId = this.currentOrderId++;
    const order: Order = { 
      ...insertOrder, 
      id: orderId,
      createdAt: new Date()
    };
    this.orders.set(orderId, order);

    // Create order items
    items.forEach(insertItem => {
      const itemId = this.currentOrderItemId++;
      const orderItem: OrderItem = { ...insertItem, id: itemId, orderId };
      this.orderItems.set(itemId, orderItem);
    });

    return order;
  }

  // Reviews
  async getProductReviews(productId: number): Promise<(Review & { user: User })[]> {
    const reviews = Array.from(this.reviews.values())
      .filter(review => review.productId === productId);

    return reviews.map(review => {
      const user = this.users.get(review.userId!);
      return { ...review, user: user! };
    }).filter(review => review.user);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const review: Review = { 
      ...insertReview, 
      id,
      createdAt: new Date()
    };
    this.reviews.set(id, review);

    // Update product rating
    const product = this.products.get(insertReview.productId!);
    if (product) {
      const reviews = Array.from(this.reviews.values())
        .filter(r => r.productId === insertReview.productId);
      
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      product.rating = avgRating.toFixed(1);
      product.reviewCount = reviews.length;
      this.products.set(product.id, product);
    }

    return review;
  }
}

export const storage = new MemStorage();
