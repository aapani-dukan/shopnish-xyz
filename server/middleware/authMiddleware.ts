// server/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express';
import { verifyToken, AuthenticatedRequest } from './verifyToken.ts';
import { userRoleEnum } from '../../shared/backend/schema.ts';

// ✅ मिडलवेयर को एक एरे के रूप में जोड़ना सबसे अच्छा तरीका है

// सामान्य प्रमाणीकरण के लिए मिडलवेयर।
// यह सुनिश्चित करता है कि उपयोगकर्ता प्रमाणित है।
export const requireAuth = [
  verifyToken,
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
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    next();
  },
];

// केवल Seller भूमिका वाले उपयोगकर्ताओं के लिए
export const requireSellerAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'seller') {
      return res.status(403).json({ message: 'Forbidden: Seller access required.' });
    }
    next();
  },
];

// केवल Delivery Boy भूमिका वाले उपयोगकर्ताओं के लिए
export const requireDeliveryBoyAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'delivery_boy') {
      return res.status(403).json({ message: 'Forbidden: Delivery Boy access required.' });
    }
    next();
  },
];
