// server/controllers/orderController.ts

// ... (अन्य सभी imports और फ़ंक्शंस)

export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const cartItems = await db.query.orderItems.findMany({
      where: and(
        eq(orderItems.userId, userId),
        eq(orderItems.status, 'in_cart')
      ),
      with: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty, cannot place an order." });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const total = subtotal;

    let orderId; // ✅ orderId को परिभाषित करें

    await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber: orderNumber,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'COD',
        deliveryAddress: req.body.deliveryAddress,
      }).returning();
      
      orderId = newOrder.id; // ✅ transaction के अंदर orderId को सेट करें

      await tx.update(orderItems)
        .set({
          status: 'pending',
          orderId: newOrder.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(orderItems.userId, userId),
          eq(orderItems.status, 'in_cart')
        ));
    });

    // ✅ सफल रिस्पांस में orderId को वापस भेजें
    res.status(201).json({ message: "Order placed successfully!", orderId: orderId });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};


/**
 * Function to get a user's orders
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const ordersWithItems = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        items: {
          with: {
            product: { with: { seller: true } },
          },
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
