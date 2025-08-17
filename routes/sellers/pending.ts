// ✅ GET /api/sellers/orders
sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    // यूज़र चेक करें
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Seller प्रोफ़ाइल चेक करें
    const [sellerProfile] = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, dbUser.id));

    if (!sellerProfile) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    const sellerId = sellerProfile.id;
    console.log('✅ /sellers/orders: Received request for sellerId:', sellerId);

    // ✅ Orders with orderItems fetch करें (Drizzle ORM)
    const orderItemsForSeller = await db.query.orderItems.findMany({
      where: eq(orderItems.sellerId, sellerId),
      with: {
        order: {
          with: {
            customer: true,
            deliveryBoy: true,
            tracking: true,
          },
        },
        product: true,
      },
      orderBy: desc(orderItems.createdAt), // ✅ FIXED
    });

    // ✅ Orders को group करें (orderId के हिसाब से)
    const groupedOrders: any = {};
    orderItemsForSeller.forEach(item => {
      const orderId = item.order.id;
      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          ...item.order,
          items: [],
        };
      }
      groupedOrders[orderId].items.push({
        ...item,
        order: undefined, // orderItem से order remove करें
      });
    });

    const ordersWithItems = Object.values(groupedOrders);

    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', ordersWithItems.length);
    return res.status(200).json(ordersWithItems);

  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});
