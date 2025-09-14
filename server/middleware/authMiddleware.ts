// server/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express';
import { verifyToken, AuthenticatedRequest } from './verifyToken.ts';
import { userRoleEnum } from '../../shared/backend/schema.ts';
// db और deliveryBoys स्कीमा की आवश्यकता नहीं है क्योंकि verifyToken उन्हें पहले ही फेच कर चुका है

// सामान्य प्रमाणीकरण के लिए मिडलवेयर।
// यह सुनिश्चित करता है कि उपयोगकर्ता प्रमाणित है।
export const requireAuth = [
  verifyToken, // ✅ verifyToken अब req.user में deliveryBoyId, role, approvalStatus जोड़ रहा है
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
    }
    next();
  },
];

// केवल Admin भूमिका वाले उपयोगकर्ताओं के लिए
export const requireAdminAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[0]) { // 'admin'
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    next();
  },
];

// केवल Seller भूमिका वाले उपयोगकर्ताओं के लिए
export const requireSellerAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[2]) { // 'seller'
      return res.status(403).json({ message: 'Forbidden: Seller access required.' });
    }
    next();
  },
];

// केवल Delivery Boy भूमिका वाले उपयोगकर्ताओं के लि
export const requireDeliveryBoyAuth = [
  ...requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("🔍 [requireDeliveryBoyAuth] User in middleware:", req.user);

    if (!req.user || req.user.role !== userRoleEnum.enumValues[4]) {
      return res.status(403).json({ message: 'Forbidden: Not a delivery boy.' });
    }

    // Database से deliveryBoyId निकालें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: (t) => t.userId.eq(req.user.id).and(t.status.eq('approved'))
    });

    if (!deliveryBoy) {
      return res.status(403).json({ message: 'Forbidden: Delivery boy not approved or not found.' });
    }

    // ✅ अब req.user में deliveryBoyId add कर दो
    req.user.deliveryBoyId = deliveryBoy.id;

    next();
  },
];
