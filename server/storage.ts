// server/storage.ts
import { db } from './db';
import {
  users,
  sellersPgTable as sellers, // sellersPgTable को sellers के रूप में इम्पोर्ट करें
  products,
  categories,
  deliveryBoys,
  orders,
  cartItems,
  orderItems,
  reviews,
  // Drizzle pgEnums और Zod स्कीमा इम्पोर्ट करें यदि storage क्लास के भीतर उनकी आवश्यकता हो
  userRoleEnum,
  approvalStatusEnum,
  insertUserSchema,
  insertSellerSchema,
  insertDeliveryBoySchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertReviewSchema,
  insertCartItemSchema,
} from '@/shared/backend/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { AuthenticatedUser } from '@/shared/types/auth'; // यहाँ से इम्पोर्ट करें
import { z } from 'zod'; // Zod इम्पोर्ट करें यदि स्कीमा वैलिडेट करने की आवश्यकता हो

class DatabaseStorage {
  // --- User Methods ---
  async getUserByFirebaseUid(firebaseUid: string) {
    return db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).execute();
  }

  async getUserById(id: number) {
    return db.select().from(users).where(eq(users.id, id)).execute();
  }

  async createUser(userData: z.infer<typeof insertUserSchema>) {
    return db.insert(users).values(userData).returning();
  }

  
    // --- Seller Methods ---
  async getSellerByUserId(userId: number) {
    return db.select().from(sellers).where(eq(sellers.userId, userId)).execute();
  }

  async createSeller(sellerData: z.infer<typeof insertSellerSchema>) {
    return db.insert(sellers).values(sellerData).returning();
  }

  async updateSellerApprovalStatus(sellerId: number, status: z.infer<typeof approvalStatusEnum>, reason?: string) {
    return db.update(sellers)
      .set({
        approvalStatus: status,
        rejectionReason: reason || null,
        approvedAt: status === approvalStatusEnum.enumValues[1] ? new Date() : null,
      })
      .where(eq(sellers.id, sellerId));
  }

  // New method for fetching all sellers (or pending sellers for admin)
  async getSellers(status?: z.infer<typeof approvalStatusEnum>) {
    let query = db.select().from(sellers).$dynamic();
    if (status) {
      query = query.where(eq(sellers.approvalStatus, status));
    }
    return query.execute();
  }

  // Renamed/modified method as per error, now handles seller approval status update
  // This replaces updateSellerStatus
  async updateSellerStatus(sellerId: number, newStatus: z.infer<typeof approvalStatusEnum>, rejectionReason?: string) {
    const updateData: { approvalStatus: z.infer<typeof approvalStatusEnum>; rejectionReason?: string | null; approvedAt?: Date | null; } = {
      approvalStatus: newStatus
    };

    if (newStatus === approvalStatusEnum.enumValues[1]) { // If approving
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null; // Clear rejection reason
    } else if (newStatus === approvalStatusEnum.enumValues[2]) { // If rejecting
      updateData.rejectionReason = rejectionReason || 'No reason provided';
      updateData.approvedAt = null; // Clear approved date
    }

    // Update the seller's record
    const [updatedSeller] = await db.update(sellers)
      .set(updateData)
      .where(eq(sellers.id, sellerId))
      .returning();

    // Also update the user's role and approval status if the seller exists
    if (updatedSeller) {
      await db.update(users)
        .set({
          role: userRoleEnum.enumValues[1], // Assuming role 'seller'
          approvalStatus: newStatus,
        })
        .where(eq(users.id, updatedSeller.userId));
    }
    return updatedSeller;
  }


  // ... (rest of the file remains the same, ensuring .execute() is used for all queries)
}

export const storage = new DatabaseStorage();


  // --- Category Methods ---
  async getCategories() {
    return db.select().from(categories).execute();
  }

  // --- Product Methods ---
  async getProducts(options: { categoryId?: number; search?: string }) {
    let query = db.select().from(products).$dynamic();

    if (options.categoryId) {
      query = query.where(eq(products.categoryId, options.categoryId));
    }
    if (options.search) {
      query = query.where(like(products.name, `%${options.search}%`));
    }
    return query.execute();
  }

  async getProductById(productId: number) {
    return db.select().from(products).where(eq(products.id, productId)).execute();
  }

  async createProduct(productData: z.infer<typeof insertProductSchema>) {
    return db.insert(products).values(productData).returning();
  }

  // --- Delivery Boy Methods ---
  async createDeliveryBoy(deliveryBoyData: z.infer<typeof insertDeliveryBoySchema>) {
    return db.insert(deliveryBoys).values(deliveryBoyData).returning();
  }

  // --- Cart Items Methods ---
  // डुप्लीकेट फ़ंक्शन इम्प्लीमेंटेशन त्रुटियों को हल करने के लिए:
  // सुनिश्चित करें कि getCartItemsForUser फ़ंक्शन केवल एक बार परिभाषित किया गया है।
  async getCartItemsForUser(userId: number) {
    return await db.select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      productName: products.name,
      productImage: products.image,
      productPrice: products.price,
      // यदि आप product की sellerId भी चाहते हैं, तो उसे यहाँ जोड़ें:
      // productSellerId: products.sellerId,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .execute(); // .execute() कॉल करें
  }

  async addCartItem(userId: number, productId: number, quantity: number) {
    const existingCartItem = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .limit(1)
      .execute();

    if (existingCartItem.length > 0) {
      // यदि आइटम पहले से मौजूद है, तो मात्रा अपडेट करें
      return db.update(cartItems)
        .set({ quantity: existingCartItem[0].quantity + quantity })
        .where(eq(cartItems.id, existingCartItem[0].id))
        .execute();
    } else {
      // यदि आइटम मौजूद नहीं है, तो नया बनाएं
      return db.insert(cartItems).values({ userId, productId, quantity }).returning().execute();
    }
  }

  async updateCartItem(cartItemId: number, quantity: number) {
    return db.update(cartItems)
      .set({ quantity }) // cartItems स्कीमा में 'updatedAt' कॉलम नहीं है, इसलिए इसे हटा दिया गया है।
      .where(eq(cartItems.id, cartItemId))
      .execute();
  }

  async removeCartItem(cartItemId: number) {
    // `Omit` से संबंधित `TS2739` त्रुटियों को हल करने के लिए:
    // यह Drizzle के इंटरनल टाइपिंग से संबंधित हो सकता है।
    // .execute() जोड़ने से कुछ मामलों में मदद मिल सकती है।
    return db.delete(cartItems).where(eq(cartItems.id, cartItemId)).execute();
  }

  async clearCart(userId: number) {
    // `Omit` से संबंधित `TS2739` त्रुटियों को हल करने के लिए:
    // .execute() जोड़ने से कुछ मामलों में मदद मिल सकती है।
    return db.delete(cartItems).where(eq(cartItems.userId, userId)).execute();
  }

  // --- Order Methods ---
  async createOrder(orderData: z.infer<typeof insertOrderSchema>) {
    return db.insert(orders).values(orderData).returning().execute();
  }

  async createOrderItems(orderItemsData: z.infer<typeof insertOrderItemSchema>[]) {
    return db.insert(orderItems).values(orderItemsData).returning().execute();
  }

  async getOrdersForUser(customerId: number) {
    // `TS2740` त्रुटि को हल करने के लिए `.` के बजाय `.$dynamic()` का उपयोग करें
    return db.select().from(orders).where(eq(orders.customerId, customerId)).execute();
  }

  async getOrderById(orderId: number) {
    return db.select().from(orders).where(eq(orders.id, orderId)).execute();
  }

  // --- Review Methods ---
  async createReview(reviewData: z.infer<typeof insertReviewSchema>) {
    return db.insert(reviews).values(reviewData).returning().execute();
  }

  async getReviewsForProduct(productId: number) {
    return db.select().from(reviews).where(eq(reviews.productId, productId)).execute();
  }
}

export const storage = new DatabaseStorage();
