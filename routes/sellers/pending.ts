// routes/sellers/pending.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema"; // users स्कीमा isAdmin के लिए
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq, desc } from "drizzle-orm"; // ✅ 'desc' को भी इम्पोर्ट करें, क्योंकि आप orderBy में इसका उपयोग कर रहे हैं

const router = Router();

// isAdmin मिडलवेयर (पिछले वाले के समान, सुनिश्चित करें कि यह आपके सिस्टम में सही ढंग से परिभाषित है)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    // ❌ OLD: const user = await db.query.users.findFirst({ where: eq(users.firebaseUid, req.user.uid), });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स
    const userResult = await db.select()
                               .from(users)
                               .where(eq(users.firebaseUid, req.user.uid))
                               .limit(1); // केवल एक रिकॉर्ड प्राप्त करने के लिए

    const user = userResult.length > 0 ? userResult[0] : null; // एरे से पहला यूजर निकालें, यदि कोई है

    if (user?.role === 'admin') {
      next(); // एडमिन है, तो अगले मिडलवेयर/राउट पर जाएँ
    } else {
      return res.status(403).json({ message: "Forbidden: Not an admin." }); // एडमिन नहीं है
    }
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ message: "Internal server error during role check." });
  }
};


/**
 * Endpoint to get all pending seller applications.
 * Requires authentication and admin privileges.
 */
router.get("/", verifyToken, isAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // ❌ OLD: const pendingSellers = await db.query.sellers.findMany({ where: eq(sellers.approvalStatus, "pending"), orderBy: (seller) => seller.appliedAt.desc(), });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स
    const pendingSellers = await db.select()
                                   .from(sellers)
                                   .where(eq(sellers.approvalStatus, "pending"))
                                   .orderBy(desc(sellers.appliedAt)); // ✅ orderBy में 'desc' हेल्पर का उपयोग करें

    res.json(pendingSellers);
  } catch (error) {
    console.error("Error fetching pending sellers:", error);
    // ✅ सुनिश्चित करें कि एरर को ठीक से हैंडल किया गया है
    next(error); // Express के एरर हैंडलिंग मिडलवेयर को पास करें
  }
});

export default router;
