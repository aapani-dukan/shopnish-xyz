// routes/sellers/pending.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema"; // users स्कीमा isAdmin के लिए
// ✅ verifyToken और AuthenticatedRequest को इम्पोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
// ✅ eq को Drizzle के लिए इम्पोर्ट करें
import { eq } from "drizzle-orm";

const router = Router();

// isAdmin मिडलवेयर (पिछले वाले के समान, सुनिश्चित करें कि यह आपके सिस्टम में सही ढंग से परिभाषित है)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, req.user.uid),
    });

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
// ✅ verifyToken और isAdmin मिडलवेयर का उपयोग करें
router.get("/", verifyToken, isAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pendingSellers = await db.query.sellers.findMany({
      where: eq(sellers.approvalStatus, "pending"), // 'eq' का स्पष्ट उपयोग
      orderBy: (seller) => seller.appliedAt.desc(),
    });

    // `uuid` का उपयोग यहाँ सीधे नहीं किया गया है, लेकिन यदि sellers स्कीमा में uuid कॉलम है
    // तो वह query result में शामिल होगा और फ्रंटएंड को भेजा जाएगा।
    // यहाँ कोई विशिष्ट `id` या `uuid` हेरफेर की आवश्यकता नहीं है।

    res.json(pendingSellers);
  } catch (error) {
    console.error("Error fetching pending sellers:", error); // डीबगिंग के लिए लॉग करें
    next(error);
  }
});

export default router;
