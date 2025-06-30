// server/roots/admin/reject-product.ts
// ...
// assuming 'product_id' is sent in request body for rejection
router.post('/admin/products/:productId/reject', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  const productId = parseInt(req.params.productId);
  const { reason } = req.body;

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID." });
  }

  try {
    // product schema में 'status' फ़ील्ड नहीं है।
    // यदि आपको उत्पाद की स्थिति को ट्रैक करने के लिए एक 'status' फ़ील्ड चाहिए,
    // तो आपको इसे shared/backend/schema.ts में 'products' टेबल में जोड़ना होगा।
    // उदाहरण के लिए: status: productStatusEnum("status").notNull().default("active"),
    // फिर आप इसे यहाँ अपडेट कर सकते हैं।
    // यदि नहीं, तो इस पंक्ति को हटा दें या टिप्पणी करें:
    await db.update(products).set({ /* status: "rejected", */ description: reason }).where(eq(products.id, productId));
    res.status(200).json({ message: 'Product rejected successfully.' });
  } catch (error: any) {
    console.error('Failed to reject product:', error);
    res.status(500).json({ error: 'Failed to reject product.' });
  }
});

// ...
