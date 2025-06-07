// routes/sellerMe.ts
router.get("/api/sellers/me", async (req, res) => {
  const user = req.user; // Firebase middleware से
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const seller = await db.query.sellers.findFirst({
    where: eq(sellers.userId, user.uid),
  });

  if (!seller) return res.status(404).json({ message: "Seller not found" });
  res.json(seller);
});
