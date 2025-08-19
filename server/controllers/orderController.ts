// controllers/orderController.ts
import { Request, Response } from "express";
import { db } from "../db.ts";
import { orders, orderItems, cart, cartItems, products } from "../../shared/backend/schema.ts";
import { eq } from "drizzle-orm";

// ✅ Helper function to generate unique order number
function generateOrderNumber() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `ORD-${yyyy}${mm}${dd}-${random}`;
}

// Place Order
export const placeOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid; // Firebase से आने वाला userId

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Get user cart
    const userCart = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, userId))
      .limit(1);

    if (!userCart.length) {
      return res.status(400).json({ error: "Cart not found" });
    }

    const cartId = userCart[0].id;

    // 2. Get cart items
    const items = await db
      .select({
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        price: products.price,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cartId));

    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // 3. Calculate total amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 4. Create new order (✅ orderNumber added)
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId,
        orderNumber: generateOrderNumber(),
        status: "pending",
        totalAmount,
        createdAt: new Date(),
      })
      .returning();

    // 5. Insert order items
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      });
    }

    // 6. Empty cart
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));

    return res.status(201).json({
      message: "Order placed successfully",
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalAmount,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all orders of logged-in user
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
    res.json(userOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all orders (Admin)
export const getAllOrders = async (_req: Request, res: Response) => {
  try {
    const allOrders = await db.select().from(orders);
    res.json(allOrders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
