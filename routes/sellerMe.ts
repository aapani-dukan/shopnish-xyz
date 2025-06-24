import express from "express";
import { verifyToken, AuthenticatedRequest } from "../server/middleware/verifyToken";
import { db } from "../server/db"; // ✅ db ऑब्जेक्ट का इम्पोर्ट सही है
import { sellers } from "../shared/backend/schema"; // ✅ स्कीमा टेबल्स का इम्पोर्ट सही है
import { eq } from "drizzle-orm"; // ✅ 'eq' का इम्पोर्ट सही है

const router = express.Router();

// 🔐 Protected route for seller's own data
router.get("/me", verifyToken, async (req: AuthenticatedRequest, res) => { // ✅ '/api/sellers/me' की जगह सिर्फ '/me' क्योंकि यह पहले से ही /api/sellers के तहत माउंट होगा
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: Missing user info" });
  }

  try {
    //❌ OLD: const seller = await db.query.sellers.findFirst({ where: eq(sellers.userId, req.user.uid), });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स का उपयोग करें
    const sellerResult = await db.select()
                                 .from(sellers)
                                 .where(eq(sellers.userId, req.user.uid))
                                 .limit(1); // केवल एक रिकॉर्ड प्राप्त करने के लिए

    const seller = sellerResult.length > 0 ? sellerResult[0] : undefined; // एरे से पहला सेलर निकालें, यदि कोई है

    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found for this user" });
    }

    res.status(200).json({data:seller});
  } catch (error) {
    console.error("Error fetching seller info:", error);
    // ✅ सुनिश्चित करें कि एरर को ठीक से हैंडल किया गया है
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
